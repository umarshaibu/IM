using IM.Core.Entities;
using IM.Core.Enums;

namespace IM.Core.Interfaces;

public interface IMessageService
{
    Task<Message> SendMessageAsync(Guid conversationId, Guid senderId, MessageType type, string? content, string? mediaUrl = null);
    Task<Message?> GetMessageByIdAsync(Guid messageId);
    Task<IEnumerable<Message>> GetConversationMessagesAsync(Guid conversationId, int page = 1, int pageSize = 50);
    Task<bool> UpdateMessageStatusAsync(Guid messageId, Guid userId, MessageStatus status);
    Task<bool> MarkAsDeliveredAsync(Guid messageId, Guid userId);
    Task<bool> MarkAsReadAsync(Guid messageId, Guid userId);
    Task<bool> DeleteMessageAsync(Guid messageId, Guid userId, bool forEveryone = false);
    Task<Message?> EditMessageAsync(Guid messageId, Guid userId, string newContent);
    Task<IEnumerable<Message>> SearchMessagesAsync(Guid userId, string query, int page = 1, int pageSize = 20);
    Task CleanupExpiredMessagesAsync();
}
