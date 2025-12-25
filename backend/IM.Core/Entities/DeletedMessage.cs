using IM.Core.Enums;

namespace IM.Core.Entities;

/// <summary>
/// Audit table for deleted messages - stores a copy of deleted messages for compliance and recovery
/// </summary>
public class DeletedMessage : BaseEntity
{
    public Guid OriginalMessageId { get; set; }
    public Guid ConversationId { get; set; }
    public Guid SenderId { get; set; }
    public string SenderServiceNumber { get; set; } = string.Empty;

    // Preserved original content (encrypted)
    public string? OriginalContent { get; set; }
    public string? OriginalMediaUrl { get; set; }
    public string? OriginalMediaThumbnailUrl { get; set; }
    public string? OriginalMediaMimeType { get; set; }
    public long? OriginalMediaSize { get; set; }
    public int? OriginalMediaDuration { get; set; }
    public MessageType OriginalType { get; set; }

    // Forward chain info (preserved for audit)
    public bool WasForwarded { get; set; }
    public string? OriginalSenderServiceNumber { get; set; }
    public string? MediaOriginatorServiceNumber { get; set; }

    // Deletion metadata
    public Guid DeletedById { get; set; }
    public string DeletedByServiceNumber { get; set; } = string.Empty;
    public DateTime DeletedAt { get; set; } = DateTime.UtcNow;
    public DeleteType DeleteType { get; set; }
    public string? DeletionReason { get; set; }

    // Original timestamps
    public DateTime OriginalCreatedAt { get; set; }
    public DateTime? OriginalEditedAt { get; set; }

    // Reply info (preserved)
    public Guid? OriginalReplyToMessageId { get; set; }

    // Navigation
    public User Sender { get; set; } = null!;
    public User DeletedBy { get; set; } = null!;
    public Conversation Conversation { get; set; } = null!;
}
