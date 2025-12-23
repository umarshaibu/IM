namespace IM.Core.Entities;

public class StatusView : BaseEntity
{
    public Guid StatusId { get; set; }
    public Guid ViewerId { get; set; }
    public DateTime ViewedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Status Status { get; set; } = null!;
    public User Viewer { get; set; } = null!;
}
