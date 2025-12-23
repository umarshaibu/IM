namespace IM.Core.Entities;

public class Contact : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid ContactUserId { get; set; }
    public string? Nickname { get; set; }
    public bool IsFavorite { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public User ContactUser { get; set; } = null!;
}
