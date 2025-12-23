using Microsoft.EntityFrameworkCore;
using IM.Core.Entities;
using IM.Core.Enums;
using IM.Core.Interfaces;
using IM.Infrastructure.Data;

namespace IM.Infrastructure.Services;

public class MessageService : IMessageService
{
    private readonly ApplicationDbContext _context;
    private readonly IEncryptionService _encryptionService;

    public MessageService(ApplicationDbContext context, IEncryptionService encryptionService)
    {
        _context = context;
        _encryptionService = encryptionService;
    }

    public async Task<Message> SendMessageAsync(Guid conversationId, Guid senderId, MessageType type, string? content, string? mediaUrl = null)
    {
        var conversation = await _context.Conversations
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == conversationId);

        if (conversation == null)
            throw new InvalidOperationException("Conversation not found");

        var participant = conversation.Participants.FirstOrDefault(p => p.UserId == senderId && p.IsActive);
        if (participant == null)
            throw new InvalidOperationException("User is not a participant of this conversation");

        DateTime? expiresAt = null;
        if (conversation.DefaultMessageExpiry != MessageExpiry.Never)
        {
            expiresAt = DateTime.UtcNow.AddHours((int)conversation.DefaultMessageExpiry);
        }

        // Encrypt content before saving to database
        var encryptedContent = !string.IsNullOrEmpty(content)
            ? _encryptionService.Encrypt(content)
            : content;

        var message = new Message
        {
            ConversationId = conversationId,
            SenderId = senderId,
            Type = type,
            Content = encryptedContent,
            MediaUrl = mediaUrl,
            ExpiryDuration = conversation.DefaultMessageExpiry,
            ExpiresAt = expiresAt
        };

        await _context.Messages.AddAsync(message);

        // Create message status for all participants except sender
        var recipientIds = conversation.Participants
            .Where(p => p.UserId != senderId && p.IsActive)
            .Select(p => p.UserId);

        foreach (var recipientId in recipientIds)
        {
            await _context.MessageStatuses.AddAsync(new MessageStatusEntity
            {
                MessageId = message.Id,
                UserId = recipientId,
                Status = MessageStatus.Sent
            });
        }

        // Update conversation last message time
        conversation.LastMessageAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Decrypt content before returning
        if (!string.IsNullOrEmpty(message.Content))
        {
            message.Content = _encryptionService.Decrypt(message.Content);
        }

        return message;
    }

    private void DecryptMessage(Message message)
    {
        if (!string.IsNullOrEmpty(message.Content))
        {
            message.Content = _encryptionService.Decrypt(message.Content);
        }
    }

    public async Task<Message?> GetMessageByIdAsync(Guid messageId)
    {
        var message = await _context.Messages
            .Include(m => m.Sender)
                .ThenInclude(s => s.NominalRoll)
            .Include(m => m.Statuses)
            .Include(m => m.ReplyToMessage)
            .FirstOrDefaultAsync(m => m.Id == messageId && !m.IsDeleted);

        if (message != null)
        {
            DecryptMessage(message);
        }

        return message;
    }

    public async Task<IEnumerable<Message>> GetConversationMessagesAsync(Guid conversationId, int page = 1, int pageSize = 50)
    {
        var messages = await _context.Messages
            .Include(m => m.Sender)
                .ThenInclude(s => s.NominalRoll)
            .Include(m => m.Statuses)
            .Include(m => m.ReplyToMessage)
            .Where(m => m.ConversationId == conversationId && !m.IsDeleted)
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // Decrypt all messages
        foreach (var message in messages)
        {
            DecryptMessage(message);
        }

        return messages;
    }

    public async Task<bool> UpdateMessageStatusAsync(Guid messageId, Guid userId, MessageStatus status)
    {
        var messageStatus = await _context.MessageStatuses
            .FirstOrDefaultAsync(ms => ms.MessageId == messageId && ms.UserId == userId);

        if (messageStatus == null)
            return false;

        messageStatus.Status = status;

        if (status == MessageStatus.Delivered)
            messageStatus.DeliveredAt = DateTime.UtcNow;
        else if (status == MessageStatus.Read)
            messageStatus.ReadAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> MarkAsDeliveredAsync(Guid messageId, Guid userId)
    {
        return await UpdateMessageStatusAsync(messageId, userId, MessageStatus.Delivered);
    }

    public async Task<bool> MarkAsReadAsync(Guid messageId, Guid userId)
    {
        return await UpdateMessageStatusAsync(messageId, userId, MessageStatus.Read);
    }

    public async Task<bool> DeleteMessageAsync(Guid messageId, Guid userId, bool forEveryone = false)
    {
        var message = await _context.Messages.FindAsync(messageId);
        if (message == null)
            return false;

        if (forEveryone)
        {
            if (message.SenderId != userId)
                return false;

            message.IsDeleted = true;
            message.DeletedAt = DateTime.UtcNow;
            message.Content = null;
            message.MediaUrl = null;
        }
        else
        {
            // For local delete, we could add a separate table for deleted messages per user
            // For now, we'll just mark as deleted for everyone if user is sender
            if (message.SenderId == userId)
            {
                message.IsDeleted = true;
                message.DeletedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<Message?> EditMessageAsync(Guid messageId, Guid userId, string newContent)
    {
        var message = await _context.Messages.FindAsync(messageId);
        if (message == null || message.SenderId != userId || message.IsDeleted)
            return null;

        // Can only edit text messages
        if (message.Type != MessageType.Text)
            return null;

        // Encrypt the new content
        message.Content = _encryptionService.Encrypt(newContent);
        message.IsEdited = true;
        message.EditedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Decrypt before returning
        message.Content = newContent; // Return the plain text to the client

        return message;
    }

    public async Task<IEnumerable<Message>> SearchMessagesAsync(Guid userId, string query, int page = 1, int pageSize = 20)
    {
        var userConversationIds = await _context.ConversationParticipants
            .Where(p => p.UserId == userId && p.IsActive)
            .Select(p => p.ConversationId)
            .ToListAsync();

        // Note: For production, consider using a separate search index or searchable encryption
        // This approach decrypts all messages which is not efficient for large datasets
        var allMessages = await _context.Messages
            .Include(m => m.Sender)
            .Include(m => m.Conversation)
            .Where(m => userConversationIds.Contains(m.ConversationId) &&
                       !m.IsDeleted &&
                       m.Type == MessageType.Text &&
                       m.Content != null)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync();

        // Decrypt and filter
        var matchingMessages = new List<Message>();
        foreach (var message in allMessages)
        {
            var decryptedContent = _encryptionService.Decrypt(message.Content!);
            if (decryptedContent.Contains(query, StringComparison.OrdinalIgnoreCase))
            {
                message.Content = decryptedContent;
                matchingMessages.Add(message);
            }

            if (matchingMessages.Count >= (page * pageSize))
                break;
        }

        return matchingMessages
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
    }

    public async Task CleanupExpiredMessagesAsync()
    {
        var expiredMessages = await _context.Messages
            .Where(m => m.ExpiresAt != null && m.ExpiresAt <= DateTime.UtcNow && !m.IsDeleted)
            .ToListAsync();

        foreach (var message in expiredMessages)
        {
            message.IsDeleted = true;
            message.DeletedAt = DateTime.UtcNow;
            message.Content = null;
            message.MediaUrl = null;
        }

        await _context.SaveChangesAsync();
    }
}
