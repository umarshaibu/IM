using Microsoft.EntityFrameworkCore;
using IM.Core.Entities;
using IM.Core.Interfaces;
using IM.Infrastructure.Data;

namespace IM.Infrastructure.Services;

public class StatusService : IStatusService
{
    private readonly ApplicationDbContext _context;

    public StatusService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Status> CreateStatusAsync(Guid userId, string? textContent, string? mediaUrl, string? mediaType, string? backgroundColor)
    {
        var status = new Status
        {
            UserId = userId,
            TextContent = textContent,
            MediaUrl = mediaUrl,
            MediaType = mediaType,
            BackgroundColor = backgroundColor,
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        };

        await _context.Statuses.AddAsync(status);
        await _context.SaveChangesAsync();

        return status;
    }

    public async Task<IEnumerable<Status>> GetContactStatusesAsync(Guid userId)
    {
        // Get all contact user IDs
        var contactUserIds = await _context.Contacts
            .Where(c => c.UserId == userId)
            .Select(c => c.ContactUserId)
            .ToListAsync();

        // Get all statuses from contacts that haven't expired
        return await _context.Statuses
            .Include(s => s.User)
                .ThenInclude(u => u.NominalRoll)
            .Include(s => s.Views)
            .Where(s => contactUserIds.Contains(s.UserId) && s.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Status>> GetUserStatusesAsync(Guid userId)
    {
        return await _context.Statuses
            .Include(s => s.Views)
                .ThenInclude(v => v.Viewer)
                    .ThenInclude(u => u.NominalRoll)
            .Where(s => s.UserId == userId && s.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
    }

    public async Task<bool> ViewStatusAsync(Guid statusId, Guid viewerId)
    {
        var status = await _context.Statuses.FindAsync(statusId);
        if (status == null || status.UserId == viewerId)
            return false;

        var existingView = await _context.StatusViews
            .FirstOrDefaultAsync(v => v.StatusId == statusId && v.ViewerId == viewerId);

        if (existingView != null)
            return true;

        var view = new StatusView
        {
            StatusId = statusId,
            ViewerId = viewerId,
            ViewedAt = DateTime.UtcNow
        };

        await _context.StatusViews.AddAsync(view);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<StatusView>> GetStatusViewsAsync(Guid statusId, Guid ownerId)
    {
        var status = await _context.Statuses.FindAsync(statusId);
        if (status == null || status.UserId != ownerId)
            return Enumerable.Empty<StatusView>();

        return await _context.StatusViews
            .Include(v => v.Viewer)
                .ThenInclude(u => u.NominalRoll)
            .Where(v => v.StatusId == statusId)
            .OrderByDescending(v => v.ViewedAt)
            .ToListAsync();
    }

    public async Task<bool> DeleteStatusAsync(Guid statusId, Guid userId)
    {
        var status = await _context.Statuses.FindAsync(statusId);
        if (status == null || status.UserId != userId)
            return false;

        _context.Statuses.Remove(status);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task CleanupExpiredStatusesAsync()
    {
        var expiredStatuses = await _context.Statuses
            .Where(s => s.ExpiresAt <= DateTime.UtcNow)
            .ToListAsync();

        if (expiredStatuses.Any())
        {
            _context.Statuses.RemoveRange(expiredStatuses);
            await _context.SaveChangesAsync();
        }
    }
}
