using IM.Core.Enums;

namespace IM.API.DTOs;

public class ConversationDto
{
    public Guid Id { get; set; }
    public ConversationType Type { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
    public MessageExpiry DefaultMessageExpiry { get; set; }
    public bool IsArchived { get; set; }
    public bool IsMuted { get; set; }
    public DateTime? MutedUntil { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public MessageDto? LastMessage { get; set; }
    public int UnreadCount { get; set; }
    public List<ParticipantDto> Participants { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class ParticipantDto
{
    public Guid UserId { get; set; }
    public string? DisplayName { get; set; }
    public string? FullName { get; set; }
    public string? ProfilePictureUrl { get; set; }
    public string? PhoneNumber { get; set; }
    public ParticipantRole Role { get; set; }
    public bool IsOnline { get; set; }
    public DateTime? LastSeen { get; set; }
    public DateTime JoinedAt { get; set; }
}

public class CreateGroupRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
    public List<Guid> MemberIds { get; set; } = new();
}

public class UpdateGroupRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
}

public class AddParticipantRequest
{
    public Guid UserId { get; set; }
}

public class UpdateParticipantRoleRequest
{
    public ParticipantRole Role { get; set; }
}

public class SetMessageExpiryRequest
{
    public MessageExpiry Expiry { get; set; }
}

public class MuteConversationRequest
{
    public DateTime? Until { get; set; }
}
