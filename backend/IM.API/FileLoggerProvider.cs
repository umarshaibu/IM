using System.Collections.Concurrent;

/// <summary>
/// Simple file logger for production debugging
/// </summary>
public class FileLoggerProvider : ILoggerProvider
{
    private readonly string _filePath;
    private readonly ConcurrentDictionary<string, FileLogger> _loggers = new();
    private readonly object _lock = new();

    public FileLoggerProvider(string filePath)
    {
        _filePath = filePath;
    }

    public ILogger CreateLogger(string categoryName)
    {
        return _loggers.GetOrAdd(categoryName, name => new FileLogger(_filePath, name, _lock));
    }

    public void Dispose()
    {
        _loggers.Clear();
    }
}

public class FileLogger : ILogger
{
    private readonly string _filePath;
    private readonly string _categoryName;
    private readonly object _lock;

    public FileLogger(string filePath, string categoryName, object lockObj)
    {
        _filePath = filePath;
        _categoryName = categoryName;
        _lock = lockObj;
    }

    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

    public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Information;

    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
    {
        if (!IsEnabled(logLevel))
            return;

        var message = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff} [{logLevel}] {_categoryName}: {formatter(state, exception)}";
        if (exception != null)
        {
            message += Environment.NewLine + exception.ToString();
        }

        lock (_lock)
        {
            try
            {
                File.AppendAllText(_filePath, message + Environment.NewLine);
            }
            catch
            {
                // Ignore file write errors
            }
        }
    }
}
