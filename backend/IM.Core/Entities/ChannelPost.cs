using IM.Core.Enums;

namespace IM.Core.Entities;

public class ChannelPost : BaseEntity
{
    public Guid ChannelId { get; set; }
    public Guid AuthorId { get; set; }
    public string? Content { get; set; }
    public MessageType Type { get; set; } = MessageType.Text;
    public string? MediaUrl { get; set; }
    public string? MediaMimeType { get; set; }
    public long? MediaSize { get; set; }
    public int? MediaDuration { get; set; } // For audio/video in seconds
    public string? ThumbnailUrl { get; set; }
    public int ViewCount { get; set; } = 0;
    public int ReactionCount { get; set; } = 0;
    public bool IsPinned { get; set; } = false;

    // Navigation
    public Channel Channel { get; set; } = null!;
    public User Author { get; set; } = null!;
    public ICollection<ChannelPostReaction> Reactions { get; set; } = new List<ChannelPostReaction>();
}
