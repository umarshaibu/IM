namespace IM.Core.Entities;

public class ChannelFollower : BaseEntity
{
    public Guid ChannelId { get; set; }
    public Guid UserId { get; set; }
    public bool IsMuted { get; set; } = false;
    public DateTime FollowedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Channel Channel { get; set; } = null!;
    public User User { get; set; } = null!;
}
