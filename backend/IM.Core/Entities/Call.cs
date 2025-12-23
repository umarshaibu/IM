using IM.Core.Enums;

namespace IM.Core.Entities;

public class Call : BaseEntity
{
    public Guid ConversationId { get; set; }
    public Guid InitiatorId { get; set; }
    public CallType Type { get; set; }
    public CallStatus Status { get; set; } = CallStatus.Ringing;
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public int? Duration { get; set; } // In seconds
    public string? RoomId { get; set; } // LiveKit room ID
    public string? RoomToken { get; set; } // LiveKit room token

    // Navigation
    public Conversation Conversation { get; set; } = null!;
    public User Initiator { get; set; } = null!;
    public ICollection<CallParticipant> Participants { get; set; } = new List<CallParticipant>();
}
