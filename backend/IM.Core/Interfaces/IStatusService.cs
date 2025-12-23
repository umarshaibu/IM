using IM.Core.Entities;

namespace IM.Core.Interfaces;

public interface IStatusService
{
    Task<Status> CreateStatusAsync(Guid userId, string? textContent, string? mediaUrl, string? mediaType, string? backgroundColor);
    Task<IEnumerable<Status>> GetContactStatusesAsync(Guid userId);
    Task<IEnumerable<Status>> GetUserStatusesAsync(Guid userId);
    Task<bool> ViewStatusAsync(Guid statusId, Guid viewerId);
    Task<IEnumerable<StatusView>> GetStatusViewsAsync(Guid statusId, Guid ownerId);
    Task<bool> DeleteStatusAsync(Guid statusId, Guid userId);
    Task CleanupExpiredStatusesAsync();
}
