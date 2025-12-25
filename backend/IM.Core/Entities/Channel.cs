namespace IM.Core.Entities;

public class Channel : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
    public Guid OwnerId { get; set; }
    public bool IsPublic { get; set; } = true;
    public bool IsVerified { get; set; } = false;
    public int FollowerCount { get; set; } = 0;
    public DateTime? LastPostAt { get; set; }

    // Navigation
    public User Owner { get; set; } = null!;
    public ICollection<ChannelFollower> Followers { get; set; } = new List<ChannelFollower>();
    public ICollection<ChannelPost> Posts { get; set; } = new List<ChannelPost>();
}
