namespace IM.Core.Entities;

public class ChannelPostReaction : BaseEntity
{
    public Guid PostId { get; set; }
    public Guid UserId { get; set; }
    public string Emoji { get; set; } = string.Empty;

    // Navigation
    public ChannelPost Post { get; set; } = null!;
    public User User { get; set; } = null!;
}
