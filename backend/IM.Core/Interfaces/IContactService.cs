using IM.Core.Entities;

namespace IM.Core.Interfaces;

public interface IContactService
{
    Task<IEnumerable<Contact>> GetContactsAsync(Guid userId);
    Task<Contact?> AddContactAsync(Guid userId, Guid contactUserId, string? nickname = null);
    Task<bool> RemoveContactAsync(Guid userId, Guid contactUserId);
    Task<bool> UpdateContactAsync(Guid userId, Guid contactUserId, string? nickname, bool? isFavorite);
    Task<IEnumerable<Contact>> SyncContactsAsync(Guid userId, IEnumerable<string> phoneNumbers);
    Task<IEnumerable<Contact>> GetFavoriteContactsAsync(Guid userId);
}
