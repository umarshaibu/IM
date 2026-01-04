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

    // Service Number watermarks
    public string? SenderServiceNumber { get; set; }
    public string? OriginalSenderServiceNumber { get; set; }  // For forwarded messages
    public string? MediaOriginatorServiceNumber { get; set; }  // For media attachments
    public int ForwardCount { get; set; }
    public DateTime? OriginalCreatedAt { get; set; }

    // Reactions
    public List<MessageReactionDto> Reactions { get; set; } = new();
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
    public string? MediaMimeType { get; set; }
    public long? MediaSize { get; set; }
    public int? MediaDuration { get; set; }
    public string? FileName { get; set; }  // For documents: original filename
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

// Reaction DTOs
public class MessageReactionDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string? UserName { get; set; }
    public string? UserServiceNumber { get; set; }
    public string Emoji { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class AddReactionRequest
{
    public string Emoji { get; set; } = string.Empty;
}

// Enhanced Delete DTOs
public class DeleteMessageRequest
{
    public DeleteType DeleteType { get; set; } = DeleteType.ForMe;
    public string? Reason { get; set; }
}

public class DeletedMessageDto
{
    public Guid Id { get; set; }
    public Guid OriginalMessageId { get; set; }
    public Guid ConversationId { get; set; }
    public Guid SenderId { get; set; }
    public string SenderServiceNumber { get; set; } = string.Empty;
    public string? OriginalContent { get; set; }
    public string? OriginalMediaUrl { get; set; }
    public MessageType OriginalType { get; set; }
    public bool WasForwarded { get; set; }
    public string? OriginalSenderServiceNumber { get; set; }
    public string DeletedByServiceNumber { get; set; } = string.Empty;
    public DateTime DeletedAt { get; set; }
    public DeleteType DeleteType { get; set; }
    public DateTime OriginalCreatedAt { get; set; }
}

// Starred Message DTOs
public class StarredMessageDto
{
    public Guid Id { get; set; }
    public Guid MessageId { get; set; }
    public MessageDto Message { get; set; } = null!;
    public DateTime StarredAt { get; set; }
}

// Pinned Message DTOs
public class PinnedMessageDto
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Guid MessageId { get; set; }
    public MessageDto Message { get; set; } = null!;
    public Guid PinnedById { get; set; }
    public string? PinnedByName { get; set; }
    public string? PinnedByServiceNumber { get; set; }
    public DateTime PinnedAt { get; set; }
}
