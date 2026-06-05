using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;
using System;
using System.Threading.Tasks;

namespace BaseCore.Common.Infrastructure
{
    /// <summary>
    /// Centralised Redis wiring for every VolunteerHub microservice.
    ///
    /// Behaviour:
    ///  - When <c>Redis:ConnectionString</c> (env <c>Redis__ConnectionString</c>) is set, registers a
    ///    shared <see cref="IConnectionMultiplexer"/> singleton and a Redis-backed
    ///    <see cref="IDistributedCache"/> (so <see cref="RedisUtils"/> helpers work across instances).
    ///  - When it is empty/absent, falls back to an in-memory distributed cache so the app still runs
    ///    locally (dev, unit tests) without a Redis server.
    ///
    /// The method returns the resolved connection string (or <c>null</c>) so callers that also need a
    /// Redis backplane (e.g. SignalR in the EventService) can reuse it.
    /// </summary>
    public static class RedisServiceCollectionExtensions
    {
        public static string? AddVolunteerHubCache(this IServiceCollection services, IConfiguration configuration)
        {
            var connectionString = configuration["Redis:ConnectionString"];
            var instanceName = configuration["Redis:InstanceName"];
            if (string.IsNullOrWhiteSpace(instanceName))
            {
                instanceName = "vhub:";
            }

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                // No Redis configured -> stay functional with a local in-memory cache.
                services.AddDistributedMemoryCache();
                return null;
            }

            // abortConnect=false keeps startup resilient if Redis is not ready yet (container boot order).
            var options = ConfigurationOptions.Parse(connectionString);
            options.AbortOnConnectFail = false;

            var multiplexer = ConnectionMultiplexer.Connect(options);
            services.AddSingleton<IConnectionMultiplexer>(multiplexer);

            services.AddStackExchangeRedisCache(redis =>
            {
                redis.ConnectionMultiplexerFactory = () => Task.FromResult<IConnectionMultiplexer>(multiplexer);
                redis.InstanceName = instanceName;
            });

            return connectionString;
        }
    }
}
