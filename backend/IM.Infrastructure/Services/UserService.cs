using Microsoft.EntityFrameworkCore;
using IM.Core.Entities;
using IM.Core.Interfaces;
using IM.Infrastructure.Data;

namespace IM.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly ApplicationDbContext _context;

    public UserService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetUserByIdAsync(Guid userId)
    {
        return await _context.Users
            .Include(u => u.NominalRoll)
            .FirstOrDefaultAsync(u => u.Id == userId);
    }

    public async Task<User?> GetUserByPhoneAsync(string phoneNumber)
    {
        return await _context.Users
            .Include(u => u.NominalRoll)
            .FirstOrDefaultAsync(u => u.PhoneNumber == phoneNumber);
    }

    public async Task<User?> GetUserByServiceNumberAsync(string serviceNumber)
    {
        return await _context.Users
            .Include(u => u.NominalRoll)
            .FirstOrDefaultAsync(u => u.NominalRoll.ServiceNumber == serviceNumber);
    }

    public async Task<IEnumerable<User>> GetAllUsersAsync(Guid currentUserId)
    {
        return await _context.Users
            .Include(u => u.NominalRoll)
            .Where(u => u.Id != currentUserId)
            .OrderBy(u => u.NominalRoll.FullName)
            .ToListAsync();
    }

    public async Task<IEnumerable<User>> SearchUsersAsync(string query, Guid currentUserId)
    {
        var lowerQuery = query.ToLower();

        return await _context.Users
            .Include(u => u.NominalRoll)
            .Where(u => u.Id != currentUserId &&
                (u.DisplayName!.ToLower().Contains(lowerQuery) ||
                 u.PhoneNumber.Contains(query) ||
                 u.NominalRoll.ServiceNumber.ToLower().Contains(lowerQuery) ||
                 u.NominalRoll.FullName.ToLower().Contains(lowerQuery)))
            .Take(20)
            .ToListAsync();
    }

    public async Task<bool> UpdateProfileAsync(Guid userId, string? displayName, string? about, string? profilePictureUrl)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return false;

        if (displayName != null)
            user.DisplayName = displayName;
        if (about != null)
            user.About = about;
        if (profilePictureUrl != null)
            user.ProfilePictureUrl = profilePictureUrl;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdatePrivacySettingsAsync(Guid userId, bool? showLastSeen, bool? showProfilePhoto, bool? showAbout, bool? readReceipts)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return false;

        if (showLastSeen.HasValue)
            user.ShowLastSeen = showLastSeen.Value;
        if (showProfilePhoto.HasValue)
            user.ShowProfilePhoto = showProfilePhoto.Value;
        if (showAbout.HasValue)
            user.ShowAbout = showAbout.Value;
        if (readReceipts.HasValue)
            user.ReadReceipts = readReceipts.Value;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateLastSeenAsync(Guid userId, bool isOnline)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return false;

        user.IsOnline = isOnline;
        user.LastSeen = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdatePublicKeyAsync(Guid userId, string publicKey)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return false;

        user.PublicKey = publicKey;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> BlockUserAsync(Guid userId, Guid blockedUserId)
    {
        if (userId == blockedUserId)
            return false;

        var exists = await _context.BlockedUsers
            .AnyAsync(b => b.UserId == userId && b.BlockedUserId == blockedUserId);

        if (exists)
            return true;

        var blockedUser = new BlockedUser
        {
            UserId = userId,
            BlockedUserId = blockedUserId
        };

        await _context.BlockedUsers.AddAsync(blockedUser);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UnblockUserAsync(Guid userId, Guid blockedUserId)
    {
        var blocked = await _context.BlockedUsers
            .FirstOrDefaultAsync(b => b.UserId == userId && b.BlockedUserId == blockedUserId);

        if (blocked == null)
            return false;

        _context.BlockedUsers.Remove(blocked);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<User>> GetBlockedUsersAsync(Guid userId)
    {
        return await _context.BlockedUsers
            .Where(b => b.UserId == userId)
            .Include(b => b.Blocked)
                .ThenInclude(u => u.NominalRoll)
            .Select(b => b.Blocked)
            .ToListAsync();
    }

    public async Task<bool> IsBlockedAsync(Guid userId, Guid otherUserId)
    {
        return await _context.BlockedUsers
            .AnyAsync(b => (b.UserId == userId && b.BlockedUserId == otherUserId) ||
                          (b.UserId == otherUserId && b.BlockedUserId == userId));
    }
}
