using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using IM.Core.Interfaces;

namespace IM.API.Hubs;

[Authorize]
public class PresenceHub : Hub
{
    private readonly IUserService _userService;
    private readonly IContactService _contactService;
    private readonly ILogger<PresenceHub> _logger;
    private static readonly Dictionary<string, HashSet<string>> _userConnections = new();
    private static readonly Dictionary<string, DateTime> _lastSeenCache = new();

    public PresenceHub(IUserService userService, IContactService contactService, ILogger<PresenceHub> logger)
    {
        _userService = userService;
        _contactService = contactService;
        _logger = logger;
    }

    private Guid GetUserId()
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim))
        {
            _logger.LogWarning("User ID claim is null or empty in PresenceHub");
            throw new HubException("User not authenticated");
        }

        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            _logger.LogWarning("Failed to parse user ID claim in PresenceHub: {Claim}", userIdClaim);
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

            _logger.LogInformation("PresenceHub: User {UserId} connecting with connection {ConnectionId}", userId, connectionId);

            lock (_userConnections)
            {
                if (!_userConnections.ContainsKey(userId.ToString()))
                {
                    _userConnections[userId.ToString()] = new HashSet<string>();
                }
                _userConnections[userId.ToString()].Add(connectionId);
            }

            _logger.LogInformation("PresenceHub: Updating last seen for user {UserId}", userId);
            await _userService.UpdateLastSeenAsync(userId, true);

            // Notify contacts that user is online
            _logger.LogInformation("PresenceHub: Getting contacts for user {UserId}", userId);
            var contacts = await _contactService.GetContactsAsync(userId);
            _logger.LogInformation("PresenceHub: Found {ContactCount} contacts for user {UserId}", contacts.Count(), userId);

            foreach (var contact in contacts)
            {
                var contactConnections = GetUserConnectionIds(contact.ContactUserId);
                foreach (var connId in contactConnections)
                {
                    _logger.LogInformation("PresenceHub: Notifying contact {ContactId} via connection {ConnId}", contact.ContactUserId, connId);
                    await Clients.Client(connId).SendAsync("ContactOnline", userId);
                }
            }

            // Send current online status of contacts to the connecting user
            var onlineContacts = contacts
                .Where(c => IsUserOnline(c.ContactUserId))
                .Select(c => c.ContactUserId)
                .ToList();

            _logger.LogInformation("PresenceHub: Sending {OnlineCount} online contacts to user {UserId}", onlineContacts.Count, userId);
            await Clients.Caller.SendAsync("OnlineContacts", onlineContacts);

            _logger.LogInformation("PresenceHub: User {UserId} connected successfully", userId);
            await base.OnConnectedAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in PresenceHub OnConnectedAsync for connection {ConnectionId}", Context.ConnectionId);
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

                    // Update last seen cache
                    lock (_lastSeenCache)
                    {
                        _lastSeenCache[userId.ToString()] = DateTime.UtcNow;
                    }
                }
            }
        }

        var isLastConnection = !_userConnections.ContainsKey(userId.ToString());
        if (isLastConnection)
        {
            await _userService.UpdateLastSeenAsync(userId, false);

            // Notify contacts that user is offline
            var contacts = await _contactService.GetContactsAsync(userId);
            foreach (var contact in contacts)
            {
                var contactConnections = GetUserConnectionIds(contact.ContactUserId);
                foreach (var connId in contactConnections)
                {
                    await Clients.Client(connId).SendAsync("ContactOffline", userId, DateTime.UtcNow);
                }
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task RequestPresence(List<Guid> userIds)
    {
        var userId = GetUserId();
        var result = new Dictionary<Guid, object>();

        foreach (var id in userIds)
        {
            var isOnline = IsUserOnline(id);
            DateTime? lastSeen = null;

            if (!isOnline)
            {
                lock (_lastSeenCache)
                {
                    if (_lastSeenCache.TryGetValue(id.ToString(), out var cached))
                    {
                        lastSeen = cached;
                    }
                }

                if (lastSeen == null)
                {
                    var user = await _userService.GetUserByIdAsync(id);
                    if (user != null)
                    {
                        lastSeen = user.LastSeen;
                    }
                }
            }

            result[id] = new { IsOnline = isOnline, LastSeen = lastSeen };
        }

        await Clients.Caller.SendAsync("PresenceUpdate", result);
    }

    public async Task Ping()
    {
        var userId = GetUserId();
        await _userService.UpdateLastSeenAsync(userId, true);
    }

    public static bool IsUserOnline(Guid userId)
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
}
