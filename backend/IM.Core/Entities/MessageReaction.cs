namespace IM.Core.Entities;

/// <summary>
/// Emoji reactions on messages
/// </summary>
public class MessageReaction : BaseEntity
{
    public Guid MessageId { get; set; }
    public Guid UserId { get; set; }
    public string Emoji { get; set; } = string.Empty;  // Unicode emoji like 👍, ❤️, 😂

    // Navigation
    public Message Message { get; set; } = null!;
    public User User { get; set; } = null!;
}
