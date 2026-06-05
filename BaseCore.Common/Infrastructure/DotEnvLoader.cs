using System.Text;

namespace BaseCore.Common.Infrastructure
{
    public static class DotEnvLoader
    {
        public static void LoadIfPresent(string? baseDirectory = null)
        {
            var directory = baseDirectory ?? AppContext.BaseDirectory;
            var path = Path.Combine(directory, ".env");

            if (!File.Exists(path))
            {
                return;
            }

            foreach (var rawLine in File.ReadAllLines(path, Encoding.UTF8))
            {
                var line = rawLine.Trim();
                if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#"))
                {
                    continue;
                }

                var separatorIndex = line.IndexOf('=');
                if (separatorIndex <= 0)
                {
                    continue;
                }

                var key = line[..separatorIndex].Trim();
                var value = line[(separatorIndex + 1)..].Trim().Trim('"');
                if (string.IsNullOrWhiteSpace(key) || Environment.GetEnvironmentVariable(key) != null)
                {
                    continue;
                }

                Environment.SetEnvironmentVariable(key, value);
            }
        }
    }
}
