using IM.Core.Interfaces;

namespace IM.API.Services;

public class StaleCallCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<StaleCallCleanupService> _logger;
    private readonly TimeSpan _cleanupInterval = TimeSpan.FromMinutes(5);
    private readonly TimeSpan _maxCallAge = TimeSpan.FromHours(1);

    public StaleCallCleanupService(
        IServiceProvider serviceProvider,
        ILogger<StaleCallCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Stale call cleanup service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupStaleCalls();
                await Task.Delay(_cleanupInterval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Graceful shutdown - this is expected
                _logger.LogInformation("Stale call cleanup service stopping");
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during stale call cleanup");

                // Wait before retrying after an error
                try
                {
                    await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }

        _logger.LogInformation("Stale call cleanup service stopped");
    }

    private async Task CleanupStaleCalls()
    {
        using var scope = _serviceProvider.CreateScope();
        var callService = scope.ServiceProvider.GetRequiredService<ICallService>();

        var cleanedCount = await callService.CleanupStaleCallsAsync(_maxCallAge);

        if (cleanedCount > 0)
        {
            _logger.LogInformation("Cleaned up {Count} stale call(s)", cleanedCount);
        }
    }
}
