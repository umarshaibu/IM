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
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during stale call cleanup");
            }

            await Task.Delay(_cleanupInterval, stoppingToken);
        }
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
