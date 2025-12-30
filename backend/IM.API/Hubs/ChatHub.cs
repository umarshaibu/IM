using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using IM.API.DTOs;
using IM.Core.Entities;
using IM.Core.Enums;
using IM.Core.Interfaces;

namespace IM.API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly IMessageService _messageService;
    private readonly IConversationService _conversationService;
    private readonly IUserService _userService;
    private readonly INotificationService _notificationService;
    private readonly ILogger<ChatHub> _logger;
    private static readonly Dictionary<string, HashSet<string>> _userConnections = new();

    public ChatHub(
        IMessageService messageService,
        IConversationService conversationService,
        IUserService userService,
        INotificationService notificationService,
        ILogger<ChatHub> logger)
    {
        _messageService = messageService;
        _conversationService = conversationService;
        _userService = userService;
        _notificationService = notificationService;
        _logger = logger;
    }

    private Guid GetUserId()
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim))
        {
            _logger.LogWarning("User ID claim is null or empty");
            throw new HubException("User not authenticated");
        }

        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            _logger.LogWarning("Failed to parse user ID claim: {Claim}", userIdClaim);
            throw new HubException("Invalid user ID");
        }

        return userId;
    }

    public override async Task OnConnectedAsync()
    {
        try
        {
            var userId = GetUserId();
            var connectionId = Context.ConnectionId;

            _logger.LogInformation("ChatHub: User {UserId} connecting with connection {ConnectionId}", userId, connectionId);

            lock (_userConnections)
            {
                if (!_userConnections.ContainsKey(userId.ToString()))
                {
                    _userConnections[userId.ToString()] = new HashSet<string>();
                }
                _userConnections[userId.ToString()].Add(connectionId);
            }

            _logger.LogInformation("ChatHub: Updating last seen for user {UserId}", userId);
            await _userService.UpdateLastSeenAsync(userId, true);

            // Join all conversation groups
            _logger.LogInformation("ChatHub: Getting conversations for user {UserId}", userId);
            var conversations = await _conversationService.GetUserConversationsAsync(userId);
            _logger.LogInformation("ChatHub: Found {ConvCount} conversations for user {UserId}", conversations.Count(), userId);

            foreach (var conversation in conversations)
            {
                await Groups.AddToGroupAsync(connectionId, conversation.Id.ToString());
            }

            // Notify contacts that user is online
            _logger.LogInformation("ChatHub: Broadcasting UserOnline for user {UserId}", userId);
            await Clients.Others.SendAsync("UserOnline", userId);

            _logger.LogInformation("ChatHub: User {UserId} connected successfully", userId);
            await base.OnConnectedAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ChatHub: Error in OnConnectedAsync for connection {ConnectionId}", Context.ConnectionId);
            throw;
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        var connectionId = Context.ConnectionId;

        lock (_userConnections)
        {
            if (_userConnections.ContainsKey(userId.ToString()))
            {
                _userConnections[userId.ToString()].Remove(connectionId);
                if (_userConnections[userId.ToString()].Count == 0)
                {
                    _userConnections.Remove(userId.ToString());
                }
            }
        }

        var isLastConnection = !_userConnections.ContainsKey(userId.ToString());
        if (isLastConnection)
        {
            await _userService.UpdateLastSeenAsync(userId, false);
            await Clients.Others.SendAsync("UserOffline", userId, DateTime.UtcNow);
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinConversation(Guid conversationId)
    {
        var userId = GetUserId();
        var conversation = await _conversationService.GetConversationByIdAsync(conversationId, userId);

        if (conversation != null)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, conversationId.ToString());
        }
    }

    public async Task LeaveConversation(Guid conversationId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, conversationId.ToString());
    }

    public async Task SendMessage(Guid conversationId, SendMessageRequest request)
    {
        var userId = GetUserId();

        try
        {
            var message = await _messageService.SendMessageAsync(
                conversationId,
                userId,
                request.Type,
                request.Content,
                request.MediaUrl);

            // Set media duration if provided (for audio/video messages)
            if (request.MediaDuration.HasValue)
            {
                message.MediaDuration = request.MediaDuration.Value;
                await _messageService.UpdateMessageAsync(message);
            }

            var messageDto = await MapMessageToDto(message);

            // Send to all participants in the conversation
            await Clients.Group(conversationId.ToString()).SendAsync("ReceiveMessage", messageDto);

            // Get offline participants for push notifications
            var participants = await _conversationService.GetParticipantsAsync(conversationId);
            var offlineUserIds = participants
                .Where(p => p.UserId != userId && !IsUserOnline(p.UserId))
                .Select(p => p.UserId)
                .ToList();

            if (offlineUserIds.Any())
            {
                await _notificationService.SendMessageNotificationAsync(message, offlineUserIds);
            }
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("MessageError", ex.Message);
        }
    }

    public async Task SendTyping(Guid conversationId)
    {
        var userId = GetUserId();
        await Clients.OthersInGroup(conversationId.ToString()).SendAsync("UserTyping", conversationId, userId);
    }

    public async Task SendStopTyping(Guid conversationId)
    {
        var userId = GetUserId();
        await Clients.OthersInGroup(conversationId.ToString()).SendAsync("UserStopTyping", conversationId, userId);
    }

    public async Task MarkMessageDelivered(Guid messageId)
    {
        var userId = GetUserId();
        await _messageService.MarkAsDeliveredAsync(messageId, userId);

        var message = await _messageService.GetMessageByIdAsync(messageId);
        if (message != null)
        {
            await Clients.Group(message.ConversationId.ToString())
                .SendAsync("MessageDelivered", messageId, userId, DateTime.UtcNow);
        }
    }

    public async Task MarkMessageRead(Guid messageId)
    {
        var userId = GetUserId();
        await _messageService.MarkAsReadAsync(messageId, userId);

        var message = await _messageService.GetMessageByIdAsync(messageId);
        if (message != null)
        {
            await Clients.Group(message.ConversationId.ToString())
                .SendAsync("MessageRead", messageId, userId, DateTime.UtcNow);
        }
    }

    public async Task MarkConversationRead(Guid conversationId)
    {
        var userId = GetUserId();
        var messages = await _messageService.GetConversationMessagesAsync(conversationId, 1, 100);

        foreach (var message in messages.Where(m => m.SenderId != userId))
        {
            await _messageService.MarkAsReadAsync(message.Id, userId);
        }

        await Clients.Group(conversationId.ToString())
            .SendAsync("ConversationRead", conversationId, userId, DateTime.UtcNow);
    }

    public async Task DeleteMessage(Guid messageId, bool forEveryone)
    {
        var userId = GetUserId();
        var message = await _messageService.GetMessageByIdAsync(messageId);

        if (message != null && await _messageService.DeleteMessageAsync(messageId, userId, forEveryone))
        {
            if (forEveryone)
            {
                await Clients.Group(message.ConversationId.ToString())
                    .SendAsync("MessageDeleted", messageId, userId);
            }
            else
            {
                await Clients.Caller.SendAsync("MessageDeleted", messageId, userId);
            }
        }
    }

    public async Task EditMessage(Guid messageId, string newContent)
    {
        var userId = GetUserId();
        var message = await _messageService.EditMessageAsync(messageId, userId, newContent);

        if (message != null)
        {
            var messageDto = await MapMessageToDto(message);
            await Clients.Group(message.ConversationId.ToString())
                .SendAsync("MessageEdited", messageDto);
        }
    }

    // Push-to-Talk (PTT) Methods
    public async Task StartPTT(Guid conversationId)
    {
        var userId = GetUserId();
        var user = await _userService.GetUserByIdAsync(userId);
        var userName = user?.DisplayName ?? user?.NominalRoll.FullName ?? "Unknown";

        _logger.LogInformation("PTT: User {UserId} started PTT in conversation {ConversationId}", userId, conversationId);

        // Notify all participants that PTT has started (via SignalR)
        await Clients.OthersInGroup(conversationId.ToString()).SendAsync("PTTStarted", conversationId, userId, userName);

        // Send FCM notification to wake up offline devices
        var participants = await _conversationService.GetParticipantsAsync(conversationId);
        var offlineUserIds = participants
            .Where(p => p.UserId != userId && !IsUserOnline(p.UserId))
            .Select(p => p.UserId)
            .ToList();

        if (offlineUserIds.Any())
        {
            _logger.LogInformation("PTT: Sending FCM notification to {Count} offline users", offlineUserIds.Count);
            await _notificationService.SendPTTNotificationAsync(conversationId, userId, userName, offlineUserIds);
        }
    }

    public async Task SendPTTChunk(Guid conversationId, string audioChunkBase64)
    {
        var userId = GetUserId();

        // Broadcast the audio chunk to all other participants for real-time playback
        await Clients.OthersInGroup(conversationId.ToString()).SendAsync("PTTChunk", conversationId, userId, audioChunkBase64);
    }

    public async Task EndPTT(Guid conversationId, string? mediaUrl, int duration)
    {
        var userId = GetUserId();

        _logger.LogInformation("PTT: User {UserId} ended PTT in conversation {ConversationId}, duration: {Duration}ms", userId, conversationId, duration);

        // Notify all participants that PTT has ended
        await Clients.OthersInGroup(conversationId.ToString()).SendAsync("PTTEnded", conversationId, userId, mediaUrl, duration);

        // If a media URL is provided, save the PTT as a voice message
        if (!string.IsNullOrEmpty(mediaUrl) && duration > 0)
        {
            try
            {
                var message = await _messageService.SendMessageAsync(
                    conversationId,
                    userId,
                    MessageType.Audio,
                    null,
                    mediaUrl);

                // Update the duration
                message.MediaDuration = duration;
                await _messageService.UpdateMessageAsync(message);

                var messageDto = await MapMessageToDto(message);
                await Clients.Group(conversationId.ToString()).SendAsync("ReceiveMessage", messageDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PTT: Error saving PTT message for user {UserId}", userId);
            }
        }
    }

    public async Task CancelPTT(Guid conversationId)
    {
        var userId = GetUserId();

        _logger.LogInformation("PTT: User {UserId} cancelled PTT in conversation {ConversationId}", userId, conversationId);

        // Notify all participants that PTT was cancelled
        await Clients.OthersInGroup(conversationId.ToString()).SendAsync("PTTCancelled", conversationId, userId);
    }

    private static bool IsUserOnline(Guid userId)
    {
        lock (_userConnections)
        {
            return _userConnections.ContainsKey(userId.ToString()) &&
                   _userConnections[userId.ToString()].Count > 0;
        }
    }

    public static IEnumerable<string> GetUserConnectionIds(Guid userId)
    {
        lock (_userConnections)
        {
            if (_userConnections.TryGetValue(userId.ToString(), out var connections))
            {
                return connections.ToList();
            }
            return Enumerable.Empty<string>();
        }
    }

    private async Task<MessageDto> MapMessageToDto(Message message)
    {
        var sender = await _userService.GetUserByIdAsync(message.SenderId);

        return new MessageDto
        {
            Id = message.Id,
            ConversationId = message.ConversationId,
            SenderId = message.SenderId,
            SenderName = sender?.DisplayName ?? sender?.NominalRoll.FullName,
            SenderProfilePicture = sender?.ProfilePictureUrl,
            Type = message.Type,
            Content = message.Content,
            MediaUrl = message.MediaUrl,
            MediaThumbnailUrl = message.MediaThumbnailUrl,
            MediaMimeType = message.MediaMimeType,
            MediaSize = message.MediaSize,
            MediaDuration = message.MediaDuration,
            ReplyToMessageId = message.ReplyToMessageId,
            IsForwarded = message.IsForwarded,
            IsEdited = message.IsEdited,
            EditedAt = message.EditedAt,
            IsDeleted = message.IsDeleted,
            CreatedAt = message.CreatedAt,
            ExpiresAt = message.ExpiresAt,
            Statuses = message.Statuses.Select(s => new MessageStatusDto
            {
                UserId = s.UserId,
                Status = s.Status,
                DeliveredAt = s.DeliveredAt,
                ReadAt = s.ReadAt
            }).ToList(),
            // Service Number watermarks
            SenderServiceNumber = message.SenderServiceNumber ?? sender?.NominalRoll?.ServiceNumber,
            OriginalSenderServiceNumber = message.OriginalSenderServiceNumber,
            MediaOriginatorServiceNumber = message.MediaOriginatorServiceNumber,
            ForwardCount = message.ForwardCount,
            OriginalCreatedAt = message.OriginalCreatedAt,
            // Reactions
            Reactions = message.Reactions?.Select(r => new MessageReactionDto
            {
                Id = r.Id,
                UserId = r.UserId,
                UserName = r.User?.DisplayName ?? r.User?.NominalRoll?.FullName,
                UserServiceNumber = r.User?.NominalRoll?.ServiceNumber,
                Emoji = r.Emoji,
                CreatedAt = r.CreatedAt
            }).ToList() ?? new List<MessageReactionDto>()
        };
    }

    // Forward Message
    public async Task ForwardMessage(Guid messageId, Guid toConversationId)
    {
        var userId = GetUserId();

        try
        {
            var forwardedMessage = await _messageService.ForwardMessageAsync(messageId, userId, toConversationId);
            var messageDto = await MapMessageToDto(forwardedMessage);

            // Send to target conversation
            await Clients.Group(toConversationId.ToString()).SendAsync("ReceiveMessage", messageDto);

            // Notify the sender that forward was successful
            await Clients.Caller.SendAsync("MessageForwarded", messageId, toConversationId, forwardedMessage.Id);

            _logger.LogInformation("Message {MessageId} forwarded to conversation {ConversationId} by user {UserId}",
                messageId, toConversationId, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error forwarding message {MessageId} to conversation {ConversationId}",
                messageId, toConversationId);
            await Clients.Caller.SendAsync("ForwardError", ex.Message);
        }
    }

    // Forward Message to Multiple Conversations
    public async Task ForwardMessageToMultiple(Guid messageId, List<Guid> conversationIds)
    {
        var userId = GetUserId();

        foreach (var conversationId in conversationIds)
        {
            try
            {
                var forwardedMessage = await _messageService.ForwardMessageAsync(messageId, userId, conversationId);
                var messageDto = await MapMessageToDto(forwardedMessage);
                await Clients.Group(conversationId.ToString()).SendAsync("ReceiveMessage", messageDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error forwarding message {MessageId} to conversation {ConversationId}",
                    messageId, conversationId);
            }
        }

        await Clients.Caller.SendAsync("MessagesForwarded", messageId, conversationIds.Count);
    }

    // Enhanced Delete with Audit Trail
    public async Task DeleteMessageWithAudit(Guid messageId, DeleteType deleteType, string? reason = null)
    {
        var userId = GetUserId();
        var message = await _messageService.GetMessageByIdAsync(messageId);

        if (message == null)
        {
            await Clients.Caller.SendAsync("DeleteError", "Message not found");
            return;
        }

        var success = await _messageService.DeleteMessageWithAuditAsync(messageId, userId, deleteType, reason);

        if (success)
        {
            if (deleteType == DeleteType.ForMe)
            {
                // Only notify the caller
                await Clients.Caller.SendAsync("MessageDeleted", messageId, userId, deleteType);
            }
            else
            {
                // Notify all participants
                await Clients.Group(message.ConversationId.ToString())
                    .SendAsync("MessageDeleted", messageId, userId, deleteType);
            }

            _logger.LogInformation("Message {MessageId} deleted by user {UserId} with type {DeleteType}",
                messageId, userId, deleteType);
        }
        else
        {
            await Clients.Caller.SendAsync("DeleteError", "Failed to delete message");
        }
    }

    // Reactions
    public async Task AddReaction(Guid messageId, string emoji)
    {
        var userId = GetUserId();

        try
        {
            var reaction = await _messageService.AddReactionAsync(messageId, userId, emoji);
            var user = await _userService.GetUserByIdAsync(userId);

            var reactionDto = new MessageReactionDto
            {
                Id = reaction.Id,
                UserId = userId,
                UserName = user?.DisplayName ?? user?.NominalRoll?.FullName,
                UserServiceNumber = user?.NominalRoll?.ServiceNumber,
                Emoji = emoji,
                CreatedAt = reaction.CreatedAt
            };

            // Get the message to find its conversation
            var message = await _messageService.GetMessageByIdAsync(messageId);
            if (message != null)
            {
                await Clients.Group(message.ConversationId.ToString())
                    .SendAsync("ReactionAdded", messageId, reactionDto);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding reaction to message {MessageId}", messageId);
            await Clients.Caller.SendAsync("ReactionError", ex.Message);
        }
    }

    public async Task RemoveReaction(Guid messageId, string emoji)
    {
        var userId = GetUserId();

        var message = await _messageService.GetMessageByIdAsync(messageId);
        if (message == null) return;

        var success = await _messageService.RemoveReactionAsync(messageId, userId, emoji);

        if (success)
        {
            await Clients.Group(message.ConversationId.ToString())
                .SendAsync("ReactionRemoved", messageId, userId, emoji);
        }
    }

    // Star/Bookmark Messages
    public async Task StarMessage(Guid messageId)
    {
        var userId = GetUserId();

        try
        {
            var starred = await _messageService.StarMessageAsync(messageId, userId);
            await Clients.Caller.SendAsync("MessageStarred", messageId, starred.StarredAt);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starring message {MessageId}", messageId);
            await Clients.Caller.SendAsync("StarError", ex.Message);
        }
    }

    public async Task UnstarMessage(Guid messageId)
    {
        var userId = GetUserId();

        var success = await _messageService.UnstarMessageAsync(messageId, userId);
        if (success)
        {
            await Clients.Caller.SendAsync("MessageUnstarred", messageId);
        }
    }

    // Pin Messages
    public async Task PinMessage(Guid conversationId, Guid messageId)
    {
        var userId = GetUserId();

        try
        {
            var pinned = await _messageService.PinMessageAsync(conversationId, messageId, userId);
            var user = await _userService.GetUserByIdAsync(userId);

            var pinnedDto = new PinnedMessageDto
            {
                Id = pinned.Id,
                ConversationId = conversationId,
                MessageId = messageId,
                PinnedById = userId,
                PinnedByName = user?.DisplayName ?? user?.NominalRoll?.FullName,
                PinnedByServiceNumber = user?.NominalRoll?.ServiceNumber,
                PinnedAt = pinned.PinnedAt
            };

            await Clients.Group(conversationId.ToString())
                .SendAsync("MessagePinned", pinnedDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error pinning message {MessageId}", messageId);
            await Clients.Caller.SendAsync("PinError", ex.Message);
        }
    }

    public async Task UnpinMessage(Guid conversationId, Guid messageId)
    {
        var userId = GetUserId();

        var success = await _messageService.UnpinMessageAsync(conversationId, messageId, userId);
        if (success)
        {
            await Clients.Group(conversationId.ToString())
                .SendAsync("MessageUnpinned", conversationId, messageId, userId);
        }
    }
}
