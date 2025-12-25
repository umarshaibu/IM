using IM.Core.Enums;

namespace IM.Core.Entities;

public class UserDevice : BaseEntity
{
    public Guid UserId { get; set; }
    public string DeviceToken { get; set; } = string.Empty;
    public DevicePlatform Platform { get; set; }
    public string? DeviceId { get; set; }
    public string? DeviceName { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsVoipToken { get; set; } = false; // iOS VoIP push token for CallKit
    public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}
