namespace IM.API.DTOs;

public class ContactDto
{
    public Guid Id { get; set; }
    public Guid ContactUserId { get; set; }
    public string? Nickname { get; set; }
    public bool IsFavorite { get; set; }
    public UserDto User { get; set; } = null!;
}

public class AddContactRequest
{
    public Guid ContactUserId { get; set; }
    public string? Nickname { get; set; }
}

public class UpdateContactRequest
{
    public string? Nickname { get; set; }
    public bool? IsFavorite { get; set; }
}

public class SyncContactsRequest
{
    public List<string> PhoneNumbers { get; set; } = new();
}
