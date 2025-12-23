using IM.Core.Enums;

namespace IM.Core.Entities;

public class Message : BaseEntity
{
    public Guid ConversationId { get; set; }
    public Guid SenderId { get; set; }
    public MessageType Type { get; set; } = MessageType.Text;
    public string? Content { get; set; } // Encrypted content
    public string? MediaUrl { get; set; }
    public string? MediaThumbnailUrl { get; set; }
    public string? MediaMimeType { get; set; }
    public long? MediaSize { get; set; }
    public int? MediaDuration { get; set; } // For audio/video
    public Guid? ReplyToMessageId { get; set; }
    public Guid? ForwardedFromMessageId { get; set; }
    public bool IsForwarded { get; set; }
    public bool IsEdited { get; set; }
    public DateTime? EditedAt { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public MessageExpiry ExpiryDuration { get; set; } = MessageExpiry.Never;
    public DateTime? ExpiresAt { get; set; }
    public bool IsSystemMessage { get; set; }

    // Navigation
    public Conversation Conversation { get; set; } = null!;
    public User Sender { get; set; } = null!;
    public Message? ReplyToMessage { get; set; }
    public Message? ForwardedFromMessage { get; set; }
    public ICollection<MessageStatusEntity> Statuses { get; set; } = new List<MessageStatusEntity>();
    public ICollection<MediaFile> MediaFiles { get; set; } = new List<MediaFile>();
}
