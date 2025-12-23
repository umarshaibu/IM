namespace IM.Core.Entities;

public class BlockedUser : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid BlockedUserId { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public User Blocked { get; set; } = null!;
}
