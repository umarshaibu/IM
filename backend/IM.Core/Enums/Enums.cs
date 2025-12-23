namespace IM.Core.Enums;

public enum UserStatus
{
    Active,
    Inactive,
    Suspended
}

public enum MessageType
{
    Text,
    Image,
    Video,
    Audio,
    Document,
    Location,
    Contact,
    Sticker
}

public enum MessageStatus
{
    Sending,
    Sent,
    Delivered,
    Read,
    Failed
}

public enum ConversationType
{
    Private,
    Group
}

public enum ParticipantRole
{
    Member,
    Admin,
    Owner
}

public enum CallType
{
    Voice,
    Video
}

public enum CallStatus
{
    Ringing,
    Ongoing,
    Ended,
    Missed,
    Declined,
    Busy
}

public enum MessageExpiry
{
    TwentyFourHours = 24,
    SevenDays = 168,
    ThirtyDays = 720,
    NinetyDays = 2160,
    Never = 0
}

public enum DevicePlatform
{
    iOS,
    Android
}
