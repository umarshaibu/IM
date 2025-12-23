using IM.Core.Entities;
using IM.Core.Enums;

namespace IM.Core.Interfaces;

public interface IConversationService
{
    Task<Conversation> GetOrCreatePrivateConversationAsync(Guid userId1, Guid userId2);
    Task<Conversation> CreateGroupConversationAsync(Guid creatorId, string name, string? description, IEnumerable<Guid> memberIds);
    Task<Conversation?> GetConversationByIdAsync(Guid conversationId, Guid userId);
    Task<IEnumerable<Conversation>> GetUserConversationsAsync(Guid userId);
    Task<bool> AddParticipantAsync(Guid conversationId, Guid userId, Guid addedById);
    Task<bool> RemoveParticipantAsync(Guid conversationId, Guid userId, Guid removedById);
    Task<bool> LeaveConversationAsync(Guid conversationId, Guid userId);
    Task<bool> UpdateConversationAsync(Guid conversationId, Guid userId, string? name, string? description, string? iconUrl);
    Task<bool> UpdateParticipantRoleAsync(Guid conversationId, Guid targetUserId, Guid updatedById, ParticipantRole newRole);
    Task<bool> SetMessageExpiryAsync(Guid conversationId, Guid userId, MessageExpiry expiry);
    Task<bool> MuteConversationAsync(Guid conversationId, Guid userId, DateTime? until);
    Task<bool> ArchiveConversationAsync(Guid conversationId, Guid userId, bool archive);
    Task<IEnumerable<ConversationParticipant>> GetParticipantsAsync(Guid conversationId);
}
