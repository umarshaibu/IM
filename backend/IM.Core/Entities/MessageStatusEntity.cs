using IM.Core.Enums;

namespace IM.Core.Entities;

public class MessageStatusEntity : BaseEntity
{
    public Guid MessageId { get; set; }
    public Guid UserId { get; set; }
    public MessageStatus Status { get; set; } = MessageStatus.Sent;
    public DateTime? DeliveredAt { get; set; }
    public DateTime? ReadAt { get; set; }

    // Navigation
    public Message Message { get; set; } = null!;
    public User User { get; set; } = null!;
}
