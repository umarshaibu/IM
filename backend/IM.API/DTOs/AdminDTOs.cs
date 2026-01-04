using IM.Core.Enums;

namespace IM.API.DTOs;

public class NominalRollDto
{
    public Guid Id { get; set; }
    public string ServiceNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? Department { get; set; }
    public string? RankPosition { get; set; }
    public UserStatus Status { get; set; }
    public bool IsRegistered { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateNominalRollRequest
{
    public string ServiceNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? Department { get; set; }
    public string? RankPosition { get; set; }
}

public class UpdateNominalRollRequest
{
    public string? FullName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? Department { get; set; }
    public string? RankPosition { get; set; }
    public UserStatus? Status { get; set; }
}

public class BulkImportResult
{
    public int TotalRecords { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public List<string> Errors { get; set; } = new();
}

public class AdminUserDto
{
    public Guid Id { get; set; }
    public string ServiceNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    public string? Department { get; set; }
    public string? RankPosition { get; set; }
    public bool IsOnline { get; set; }
    public DateTime? LastSeen { get; set; }
    public DateTime CreatedAt { get; set; }
    public UserStatus Status { get; set; }
}

public class UpdateUserStatusRequest
{
    public UserStatus Status { get; set; }
}

public class BroadcastMessageRequest
{
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
}

public class AnalyticsDto
{
    public int TotalUsers { get; set; }
    public int OnlineUsers { get; set; }
    public int TotalConversations { get; set; }
    public int TotalMessages { get; set; }
    public int TodayMessages { get; set; }
    public int TotalCalls { get; set; }
    public int TodayCalls { get; set; }
    public int NominalRollCount { get; set; }
    public int RegisteredCount { get; set; }
}
