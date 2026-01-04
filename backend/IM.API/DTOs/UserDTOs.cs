namespace IM.API.DTOs;

public class UserDto
{
    public Guid Id { get; set; }
    public string ServiceNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    public string? ProfilePictureUrl { get; set; }
    public string? About { get; set; }
    public DateTime? LastSeen { get; set; }
    public bool IsOnline { get; set; }
    public string? Department { get; set; }
    public string? RankPosition { get; set; }
}

public class UserProfileDto
{
    public Guid Id { get; set; }
    public string ServiceNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    public string? ProfilePictureUrl { get; set; }
    public string? About { get; set; }
    public DateTime? LastSeen { get; set; }
    public bool IsOnline { get; set; }
    public string? Department { get; set; }
    public string? RankPosition { get; set; }
    public bool ShowLastSeen { get; set; }
    public bool ShowProfilePhoto { get; set; }
    public bool ShowAbout { get; set; }
    public bool ReadReceipts { get; set; }
    public string? PublicKey { get; set; }
}

public class UpdateProfileRequest
{
    public string? DisplayName { get; set; }
    public string? About { get; set; }
    public string? ProfilePictureUrl { get; set; }
}

public class UpdatePrivacyRequest
{
    public bool? ShowLastSeen { get; set; }
    public bool? ShowProfilePhoto { get; set; }
    public bool? ShowAbout { get; set; }
    public bool? ReadReceipts { get; set; }
}

public class UpdatePublicKeyRequest
{
    public string PublicKey { get; set; } = string.Empty;
}
