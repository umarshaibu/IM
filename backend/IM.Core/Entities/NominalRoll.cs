using IM.Core.Enums;

namespace IM.Core.Entities;

public class NominalRoll : BaseEntity
{
    public string ServiceNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? Department { get; set; }
    public string? RankPosition { get; set; }
    public UserStatus Status { get; set; } = UserStatus.Active;

    // Navigation
    public User? User { get; set; }
}
