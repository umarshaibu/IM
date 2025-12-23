using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using IM.Core.Entities;
using IM.Core.Enums;
using IM.Core.Interfaces;
using IM.Infrastructure.Data;
using FirebaseMessage = FirebaseAdmin.Messaging.Message;

namespace IM.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<NotificationService> _logger;
    private readonly FirebaseMessaging? _firebaseMessaging;

    public NotificationService(ApplicationDbContext context, IConfiguration configuration, ILogger<NotificationService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;

        // Initialize Firebase if not already initialized
        try
        {
            var firebaseCredentialsPath = _configuration["Firebase:CredentialsPath"];
            if (!string.IsNullOrEmpty(firebaseCredentialsPath) && File.Exists(firebaseCredentialsPath))
            {
                if (FirebaseApp.DefaultInstance == null)
                {
                    FirebaseApp.Create(new AppOptions
                    {
                        Credential = GoogleCredential.FromFile(firebaseCredentialsPath)
                    });
                }
                _firebaseMessaging = FirebaseMessaging.DefaultInstance;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to initialize Firebase. Push notifications will be disabled.");
        }
    }

    public async Task SendMessageNotificationAsync(IM.Core.Entities.Message message, IEnumerable<Guid> recipientIds)
    {
        if (_firebaseMessaging == null)
            return;

        var devices = await _context.UserDevices
            .Where(d => recipientIds.Contains(d.UserId) && d.IsActive)
            .ToListAsync();

        if (!devices.Any())
            return;

        var sender = await _context.Users
            .Include(u => u.NominalRoll)
            .FirstAsync(u => u.Id == message.SenderId);

        var senderName = sender.DisplayName ?? sender.NominalRoll.FullName;
        var messagePreview = message.Type == MessageType.Text
            ? (message.Content?.Length > 100 ? message.Content[..100] + "..." : message.Content)
            : GetMessageTypePreview(message.Type);

        var notifications = devices.Select(device => new FirebaseMessage
        {
            Token = device.DeviceToken,
            Notification = new Notification
            {
                Title = senderName,
                Body = messagePreview
            },
            Data = new Dictionary<string, string>
            {
                { "type", "message" },
                { "conversationId", message.ConversationId.ToString() },
                { "messageId", message.Id.ToString() },
                { "senderId", message.SenderId.ToString() }
            },
            Android = new AndroidConfig
            {
                Priority = Priority.High,
                Notification = new AndroidNotification
                {
                    ChannelId = "messages",
                    Priority = NotificationPriority.HIGH
                }
            },
            Apns = new ApnsConfig
            {
                Aps = new Aps
                {
                    Badge = 1,
                    Sound = "default",
                    ContentAvailable = true
                }
            }
        }).ToList();

        foreach (var notification in notifications)
        {
            try
            {
                await _firebaseMessaging.SendAsync(notification);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send push notification");
            }
        }
    }

    public async Task SendCallNotificationAsync(Call call, IEnumerable<Guid> recipientIds)
    {
        if (_firebaseMessaging == null)
        {
            _logger.LogWarning("Firebase messaging not initialized, cannot send call notification");
            return;
        }

        var devices = await _context.UserDevices
            .Where(d => recipientIds.Contains(d.UserId) && d.IsActive)
            .ToListAsync();

        if (!devices.Any())
        {
            _logger.LogWarning("No active devices found for call notification recipients");
            return;
        }

        var initiator = await _context.Users
            .Include(u => u.NominalRoll)
            .FirstAsync(u => u.Id == call.InitiatorId);

        var callerName = initiator.DisplayName ?? initiator.NominalRoll.FullName;
        var callTypeText = call.Type == CallType.Video ? "video" : "voice";

        _logger.LogInformation("Sending call notification to {DeviceCount} devices for call {CallId}", devices.Count, call.Id);

        foreach (var device in devices)
        {
            try
            {
                // For Android: Use data-only message with high priority
                // This ensures the app's background message handler is invoked
                // and can display a high-priority notification that wakes the device
                var firebaseMessage = new FirebaseMessage
                {
                    Token = device.DeviceToken,
                    // Data-only message for background handling
                    Data = new Dictionary<string, string>
                    {
                        { "type", "call" },
                        { "callId", call.Id.ToString() },
                        { "callerId", call.InitiatorId.ToString() },
                        { "callerName", callerName },
                        { "callType", call.Type.ToString() },
                        { "conversationId", call.ConversationId.ToString() }
                    },
                    Android = new AndroidConfig
                    {
                        // High priority ensures the message is delivered immediately
                        Priority = Priority.High,
                        // Short TTL for calls - they're time-sensitive
                        TimeToLive = TimeSpan.FromSeconds(30)
                    },
                    Apns = new ApnsConfig
                    {
                        Headers = new Dictionary<string, string>
                        {
                            { "apns-push-type", "voip" },
                            { "apns-priority", "10" },
                            { "apns-expiration", "30" }
                        },
                        Aps = new Aps
                        {
                            ContentAvailable = true,
                            Sound = "ringtone.caf",
                            MutableContent = true
                        }
                    }
                };

                var messageId = await _firebaseMessaging.SendAsync(firebaseMessage);
                _logger.LogInformation("Call notification sent successfully. MessageId: {MessageId}, Device: {DeviceToken}",
                    messageId, device.DeviceToken[..20] + "...");
            }
            catch (FirebaseMessagingException fex)
            {
                _logger.LogError(fex, "Firebase error sending call notification. Code: {Code}, Message: {Message}",
                    fex.ErrorCode, fex.Message);

                // If token is invalid, mark device as inactive
                if (fex.ErrorCode == ErrorCode.NotFound || fex.ErrorCode == ErrorCode.InvalidArgument)
                {
                    device.IsActive = false;
                    await _context.SaveChangesAsync();
                    _logger.LogWarning("Marked device as inactive due to invalid token");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send call notification to device");
            }
        }
    }

    public async Task SendGroupNotificationAsync(Conversation conversation, string message, IEnumerable<Guid> recipientIds)
    {
        if (_firebaseMessaging == null)
            return;

        var devices = await _context.UserDevices
            .Where(d => recipientIds.Contains(d.UserId) && d.IsActive)
            .ToListAsync();

        if (!devices.Any())
            return;

        foreach (var device in devices)
        {
            try
            {
                var firebaseNotification = new FirebaseMessage
                {
                    Token = device.DeviceToken,
                    Notification = new Notification
                    {
                        Title = conversation.Name ?? "Group",
                        Body = message
                    },
                    Data = new Dictionary<string, string>
                    {
                        { "type", "group" },
                        { "conversationId", conversation.Id.ToString() }
                    }
                };

                await _firebaseMessaging.SendAsync(firebaseNotification);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send group notification");
            }
        }
    }

    public async Task RegisterDeviceTokenAsync(Guid userId, string token, string platform, string? deviceId)
    {
        var existingDevice = await _context.UserDevices
            .FirstOrDefaultAsync(d => d.DeviceToken == token);

        if (existingDevice != null)
        {
            existingDevice.UserId = userId;
            existingDevice.IsActive = true;
            existingDevice.LastActiveAt = DateTime.UtcNow;
        }
        else
        {
            var device = new UserDevice
            {
                UserId = userId,
                DeviceToken = token,
                Platform = Enum.Parse<DevicePlatform>(platform, true),
                DeviceId = deviceId,
                IsActive = true,
                LastActiveAt = DateTime.UtcNow
            };

            await _context.UserDevices.AddAsync(device);
        }

        await _context.SaveChangesAsync();
    }

    public async Task UnregisterDeviceTokenAsync(Guid userId, string token)
    {
        var device = await _context.UserDevices
            .FirstOrDefaultAsync(d => d.UserId == userId && d.DeviceToken == token);

        if (device != null)
        {
            device.IsActive = false;
            await _context.SaveChangesAsync();
        }
    }

    public async Task SendBroadcastNotificationAsync(string title, string body)
    {
        if (_firebaseMessaging == null)
            return;

        var devices = await _context.UserDevices
            .Where(d => d.IsActive)
            .ToListAsync();

        foreach (var device in devices)
        {
            try
            {
                var firebaseMessage = new FirebaseMessage
                {
                    Token = device.DeviceToken,
                    Notification = new Notification
                    {
                        Title = title,
                        Body = body
                    },
                    Data = new Dictionary<string, string>
                    {
                        { "type", "broadcast" }
                    }
                };

                await _firebaseMessaging.SendAsync(firebaseMessage);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send broadcast notification");
            }
        }
    }

    private static string GetMessageTypePreview(MessageType type)
    {
        return type switch
        {
            MessageType.Image => "📷 Photo",
            MessageType.Video => "🎥 Video",
            MessageType.Audio => "🎵 Audio",
            MessageType.Document => "📄 Document",
            MessageType.Location => "📍 Location",
            MessageType.Contact => "👤 Contact",
            MessageType.Sticker => "🎨 Sticker",
            _ => "New message"
        };
    }
}
