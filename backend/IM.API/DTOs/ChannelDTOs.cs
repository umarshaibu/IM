using IM.Core.Enums;

namespace IM.API.DTOs;

public class ChannelDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ShortName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
    public Guid OwnerId { get; set; }
    public string? OwnerName { get; set; }
    public bool IsPublic { get; set; }
    public bool IsVerified { get; set; }
    public int FollowerCount { get; set; }
    public bool IsFollowing { get; set; }
    public bool IsMuted { get; set; }
    public DateTime? LastPostAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ChannelPostDto
{
    public Guid Id { get; set; }
    public Guid ChannelId { get; set; }
    public string ChannelName { get; set; } = string.Empty;
    public Guid AuthorId { get; set; }
    public string? AuthorName { get; set; }
    public string? AuthorProfilePicture { get; set; }
    public string? Content { get; set; }
    public MessageType Type { get; set; }
    public string? MediaUrl { get; set; }
    public string? MediaMimeType { get; set; }
    public long? MediaSize { get; set; }
    public int? MediaDuration { get; set; }
    public string? ThumbnailUrl { get; set; }
    public int ViewCount { get; set; }
    public int ReactionCount { get; set; }
    public bool IsPinned { get; set; }
    public List<ReactionSummaryDto> Reactions { get; set; } = new();
    public string? MyReaction { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ReactionSummaryDto
{
    public string Emoji { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class CreateChannelRequest
{
    public string Name { get; set; } = string.Empty;
    public string ShortName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
    public bool IsPublic { get; set; } = true;
}

public class UpdateChannelRequest
{
    public string? Name { get; set; }
    public string? ShortName { get; set; }
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
}

public class CreateChannelPostRequest
{
    public string? Content { get; set; }
    public MessageType Type { get; set; } = MessageType.Text;
    public string? MediaUrl { get; set; }
    public string? MediaMimeType { get; set; }
    public long? MediaSize { get; set; }
    public int? MediaDuration { get; set; }
    public string? ThumbnailUrl { get; set; }
}

public class ReactToPostRequest
{
    public string Emoji { get; set; } = string.Empty;
}
