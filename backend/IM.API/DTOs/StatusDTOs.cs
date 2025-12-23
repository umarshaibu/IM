namespace IM.API.DTOs;

public class StatusDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string? UserDisplayName { get; set; }
    public string? UserProfilePicture { get; set; }
    public string? TextContent { get; set; }
    public string? MediaUrl { get; set; }
    public string? MediaType { get; set; }
    public string? BackgroundColor { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public int ViewCount { get; set; }
    public bool IsViewed { get; set; }
    public List<StatusViewDto> Views { get; set; } = new();
}

public class StatusViewDto
{
    public Guid ViewerId { get; set; }
    public string? ViewerName { get; set; }
    public string? ViewerProfilePicture { get; set; }
    public DateTime ViewedAt { get; set; }
}

public class CreateStatusRequest
{
    public string? TextContent { get; set; }
    public string? MediaUrl { get; set; }
    public string? MediaType { get; set; }
    public string? BackgroundColor { get; set; }
}

public class UserStatusesDto
{
    public UserDto User { get; set; } = null!;
    public List<StatusDto> Statuses { get; set; } = new();
    public bool HasUnviewed { get; set; }
}
