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
            }).ToList()
        };
    }
}
