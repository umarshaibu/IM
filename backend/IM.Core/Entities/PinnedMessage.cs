namespace IM.Core.Entities;

/// <summary>
/// Pinned messages in a conversation - visible to all participants
/// </summary>
public class PinnedMessage : BaseEntity
{
    public Guid ConversationId { get; set; }
    public Guid MessageId { get; set; }
    public Guid PinnedById { get; set; }
    public DateTime PinnedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Conversation Conversation { get; set; } = null!;
    public Message Message { get; set; } = null!;
    public User PinnedBy { get; set; } = null!;
}
