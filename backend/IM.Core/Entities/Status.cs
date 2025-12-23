namespace IM.Core.Entities;

public class Status : BaseEntity
{
    public Guid UserId { get; set; }
    public string? TextContent { get; set; }
    public string? MediaUrl { get; set; }
    public string? MediaType { get; set; }
    public string? BackgroundColor { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsViewedByAll { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public ICollection<StatusView> Views { get; set; } = new List<StatusView>();
}
