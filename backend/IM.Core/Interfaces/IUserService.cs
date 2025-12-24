using IM.Core.Entities;

namespace IM.Core.Interfaces;

public interface IUserService
{
    Task<User?> GetUserByIdAsync(Guid userId);
    Task<User?> GetUserByPhoneAsync(string phoneNumber);
    Task<User?> GetUserByServiceNumberAsync(string serviceNumber);
    Task<IEnumerable<User>> GetAllUsersAsync(Guid currentUserId);
    Task<IEnumerable<User>> SearchUsersAsync(string query, Guid currentUserId);
    Task<bool> UpdateProfileAsync(Guid userId, string? displayName, string? about, string? profilePictureUrl);
    Task<bool> UpdatePrivacySettingsAsync(Guid userId, bool? showLastSeen, bool? showProfilePhoto, bool? showAbout, bool? readReceipts);
    Task<bool> UpdateLastSeenAsync(Guid userId, bool isOnline);
    Task<bool> UpdatePublicKeyAsync(Guid userId, string publicKey);
    Task<bool> BlockUserAsync(Guid userId, Guid blockedUserId);
    Task<bool> UnblockUserAsync(Guid userId, Guid blockedUserId);
    Task<IEnumerable<User>> GetBlockedUsersAsync(Guid userId);
    Task<bool> IsBlockedAsync(Guid userId, Guid otherUserId);
}
