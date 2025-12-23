namespace IM.Core.Entities;

public class MediaFile : BaseEntity
{
    public Guid? MessageId { get; set; }
    public Guid UploadedById { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string MimeType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public int? Duration { get; set; } // For audio/video in seconds
    public string? EncryptionKey { get; set; } // For E2E encrypted files

    // Navigation
    public Message? Message { get; set; }
    public User UploadedBy { get; set; } = null!;
}
