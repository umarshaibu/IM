using IM.Core.Enums;

namespace IM.API.DTOs;

public class MessageDto
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Guid SenderId { get; set; }
    public string? SenderName { get; set; }
    public string? SenderProfilePicture { get; set; }
    public MessageType Type { get; set; }
    public string? Content { get; set; }
    public string? MediaUrl { get; set; }
    public string? MediaThumbnailUrl { get; set; }
    public string? MediaMimeType { get; set; }
    public long? MediaSize { get; set; }
    public int? MediaDuration { get; set; }
    public Guid? ReplyToMessageId { get; set; }
    public MessageDto? ReplyToMessage { get; set; }
    public bool IsForwarded { get; set; }
    public bool IsEdited { get; set; }
    public DateTime? EditedAt { get; set; }
    public bool IsDeleted { get; set; }
    public MessageStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public List<MessageStatusDto> Statuses { get; set; } = new();
}

public class MessageStatusDto
{
    public Guid UserId { get; set; }
    public MessageStatus Status { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime? ReadAt { get; set; }
}

public class SendMessageRequest
{
    public MessageType Type { get; set; } = MessageType.Text;
    public string? Content { get; set; }
    public string? MediaUrl { get; set; }
    public Guid? ReplyToMessageId { get; set; }
}

public class EditMessageRequest
{
    public string Content { get; set; } = string.Empty;
}

public class ForwardMessageRequest
{
    public Guid MessageId { get; set; }
    public List<Guid> ConversationIds { get; set; } = new();
}
