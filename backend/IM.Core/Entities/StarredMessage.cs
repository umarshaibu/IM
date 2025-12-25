namespace IM.Core.Entities;

/// <summary>
/// User's bookmarked/starred messages
/// </summary>
public class StarredMessage : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid MessageId { get; set; }
    public DateTime StarredAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public Message Message { get; set; } = null!;
}
