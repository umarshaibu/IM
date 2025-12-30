using IM.Core.Enums;

namespace IM.Core.Entities;

public class Conversation : BaseEntity
{
    public ConversationType Type { get; set; }
    public string? Name { get; set; } // For groups
    public string? Description { get; set; } // For groups
    public string? IconUrl { get; set; } // For groups
    public Guid? CreatedById { get; set; }
    public MessageExpiry DefaultMessageExpiry { get; set; } = MessageExpiry.Never;
    public bool IsArchived { get; set; }
    public bool IsMuted { get; set; }
    public DateTime? MutedUntil { get; set; }
    public DateTime? LastMessageAt { get; set; }

    // Soft delete
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedById { get; set; }

    // Navigation
    public User? CreatedBy { get; set; }
    public User? DeletedBy { get; set; }
    public ICollection<ConversationParticipant> Participants { get; set; } = new List<ConversationParticipant>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}
