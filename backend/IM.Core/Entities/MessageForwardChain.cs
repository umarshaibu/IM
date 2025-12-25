namespace IM.Core.Entities;

/// <summary>
/// Tracks the chain of forwards for a message - audit trail of who forwarded what
/// </summary>
public class MessageForwardChain : BaseEntity
{
    public Guid MessageId { get; set; }  // The forwarded message
    public Guid OriginalMessageId { get; set; }  // The original source message
    public Guid ForwarderId { get; set; }  // Who forwarded it
    public string ForwarderServiceNumber { get; set; } = string.Empty;
    public Guid FromConversationId { get; set; }  // Where it was forwarded from
    public Guid ToConversationId { get; set; }  // Where it was forwarded to
    public DateTime ForwardedAt { get; set; } = DateTime.UtcNow;
    public int ForwardOrder { get; set; }  // 1 = first forward, 2 = second, etc.

    // Navigation
    public Message Message { get; set; } = null!;
    public Message OriginalMessage { get; set; } = null!;
    public User Forwarder { get; set; } = null!;
    public Conversation FromConversation { get; set; } = null!;
    public Conversation ToConversation { get; set; } = null!;
}
