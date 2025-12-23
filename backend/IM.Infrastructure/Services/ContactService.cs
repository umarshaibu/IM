using Microsoft.EntityFrameworkCore;
using IM.Core.Entities;
using IM.Core.Interfaces;
using IM.Infrastructure.Data;

namespace IM.Infrastructure.Services;

public class ContactService : IContactService
{
    private readonly ApplicationDbContext _context;

    public ContactService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Contact>> GetContactsAsync(Guid userId)
    {
        return await _context.Contacts
            .Include(c => c.ContactUser)
                .ThenInclude(u => u.NominalRoll)
            .Where(c => c.UserId == userId)
            .OrderBy(c => c.Nickname ?? c.ContactUser.DisplayName ?? c.ContactUser.NominalRoll.FullName)
            .ToListAsync();
    }

    public async Task<Contact?> AddContactAsync(Guid userId, Guid contactUserId, string? nickname = null)
    {
        if (userId == contactUserId)
            return null;

        // Check if contact already exists
        var existing = await _context.Contacts
            .FirstOrDefaultAsync(c => c.UserId == userId && c.ContactUserId == contactUserId);

        if (existing != null)
            return existing;

        // Check if contact user exists
        var contactUser = await _context.Users.FindAsync(contactUserId);
        if (contactUser == null)
            return null;

        var contact = new Contact
        {
            UserId = userId,
            ContactUserId = contactUserId,
            Nickname = nickname
        };

        await _context.Contacts.AddAsync(contact);
        await _context.SaveChangesAsync();

        return await _context.Contacts
            .Include(c => c.ContactUser)
                .ThenInclude(u => u.NominalRoll)
            .FirstAsync(c => c.Id == contact.Id);
    }

    public async Task<bool> RemoveContactAsync(Guid userId, Guid contactUserId)
    {
        var contact = await _context.Contacts
            .FirstOrDefaultAsync(c => c.UserId == userId && c.ContactUserId == contactUserId);

        if (contact == null)
            return false;

        _context.Contacts.Remove(contact);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateContactAsync(Guid userId, Guid contactUserId, string? nickname, bool? isFavorite)
    {
        var contact = await _context.Contacts
            .FirstOrDefaultAsync(c => c.UserId == userId && c.ContactUserId == contactUserId);

        if (contact == null)
            return false;

        if (nickname != null)
            contact.Nickname = nickname;
        if (isFavorite.HasValue)
            contact.IsFavorite = isFavorite.Value;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<Contact>> SyncContactsAsync(Guid userId, IEnumerable<string> phoneNumbers)
    {
        var existingContacts = await _context.Contacts
            .Where(c => c.UserId == userId)
            .Select(c => c.ContactUserId)
            .ToListAsync();

        var usersWithPhones = await _context.Users
            .Include(u => u.NominalRoll)
            .Where(u => phoneNumbers.Contains(u.PhoneNumber) && u.Id != userId && !existingContacts.Contains(u.Id))
            .ToListAsync();

        var newContacts = new List<Contact>();

        foreach (var user in usersWithPhones)
        {
            var contact = new Contact
            {
                UserId = userId,
                ContactUserId = user.Id
            };
            newContacts.Add(contact);
        }

        if (newContacts.Any())
        {
            await _context.Contacts.AddRangeAsync(newContacts);
            await _context.SaveChangesAsync();
        }

        return await GetContactsAsync(userId);
    }

    public async Task<IEnumerable<Contact>> GetFavoriteContactsAsync(Guid userId)
    {
        return await _context.Contacts
            .Include(c => c.ContactUser)
                .ThenInclude(u => u.NominalRoll)
            .Where(c => c.UserId == userId && c.IsFavorite)
            .OrderBy(c => c.Nickname ?? c.ContactUser.DisplayName ?? c.ContactUser.NominalRoll.FullName)
            .ToListAsync();
    }
}
