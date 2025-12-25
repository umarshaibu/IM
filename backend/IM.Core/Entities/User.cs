using IM.Core.Enums;

namespace IM.Core.Entities;

public class User : BaseEntity
{
    public Guid NominalRollId { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? ProfilePictureUrl { get; set; }
    public string? About { get; set; } = "Hey there! I am using IM";
    public DateTime? LastSeen { get; set; }
    public bool IsOnline { get; set; }
    public string? PublicKey { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }
    public bool ShowLastSeen { get; set; } = true;
    public bool ShowProfilePhoto { get; set; } = true;
    public bool ShowAbout { get; set; } = true;
    public bool ReadReceipts { get; set; } = true;

    // Navigation
    public NominalRoll NominalRoll { get; set; } = null!;
    public ICollection<UserDevice> Devices { get; set; } = new List<UserDevice>();
    public ICollection<Contact> Contacts { get; set; } = new List<Contact>();
    public ICollection<ConversationParticipant> ConversationParticipants { get; set; } = new List<ConversationParticipant>();
    public ICollection<Message> SentMessages { get; set; } = new List<Message>();
    public ICollection<BlockedUser> BlockedUsers { get; set; } = new List<BlockedUser>();
    public ICollection<BlockedUser> BlockedByUsers { get; set; } = new List<BlockedUser>();
    public ICollection<Status> Statuses { get; set; } = new List<Status>();
    public ICollection<Channel> OwnedChannels { get; set; } = new List<Channel>();
    public ICollection<ChannelFollower> FollowedChannels { get; set; } = new List<ChannelFollower>();
}
