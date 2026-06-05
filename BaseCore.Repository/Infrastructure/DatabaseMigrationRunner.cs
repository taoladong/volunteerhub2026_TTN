using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.Repository.Infrastructure
{
    public static class DatabaseMigrationRunner
    {
        private const string MigrationMutexName = @"Global\BaseCore_VolunteerHub_Migration";
        private const int MaxConnectionAttempts = 6;
        private static readonly TimeSpan ConnectionRetryDelay = TimeSpan.FromSeconds(2);

        public static void RunWithProcessLock<TContext>(TContext dbContext, TimeSpan? timeout = null)
            where TContext : DbContext
        {
            using var mutex = new Mutex(false, MigrationMutexName);
            var acquired = false;

            try
            {
                acquired = mutex.WaitOne(timeout ?? TimeSpan.FromSeconds(60));
                if (!acquired)
                {
                    throw new TimeoutException("Timed out waiting for database migration lock.");
                }

                // LocalDB may need a few seconds to wake up when multiple hosts start
                // simultaneously. Probe the connection with retry before running migrations
                // so we don't propagate the transient "SQL Server process failed to start"
                // error to the host startup pipeline.
                EnsureConnectable(dbContext);

                dbContext.Database.Migrate();
            }
            finally
            {
                if (acquired)
                {
                    mutex.ReleaseMutex();
                }
            }
        }

        private static void EnsureConnectable(DbContext dbContext)
        {
            for (var attempt = 1; attempt <= MaxConnectionAttempts; attempt++)
            {
                try
                {
                    dbContext.Database.OpenConnection();
                    dbContext.Database.CloseConnection();
                    return;
                }
                // Error 4060: the server is reachable and the login succeeded, but the
                // target database does not exist yet (e.g. a brand-new SQL Server
                // container or VPS). That's expected on first boot - Database.Migrate()
                // below will create it. Stop probing and let migration proceed.
                catch (SqlException ex) when (ex.Number == 4060)
                {
                    return;
                }
                catch (SqlException) when (attempt < MaxConnectionAttempts)
                {
                    Thread.Sleep(ConnectionRetryDelay);
                }
            }
        }
    }
}
