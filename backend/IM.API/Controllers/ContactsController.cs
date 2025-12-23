using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using IM.API.DTOs;
using IM.Core.Interfaces;
using System.Security.Claims;

namespace IM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ContactsController : ControllerBase
{
    private readonly IContactService _contactService;

    public ContactsController(IContactService contactService)
    {
        _contactService = contactService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ContactDto>>> GetContacts()
    {
        var userId = GetUserId();
        var contacts = await _contactService.GetContactsAsync(userId);

        return Ok(contacts.Select(c => new ContactDto
        {
            Id = c.Id,
            ContactUserId = c.ContactUserId,
            Nickname = c.Nickname,
            IsFavorite = c.IsFavorite,
            User = new UserDto
            {
                Id = c.ContactUser.Id,
                ServiceNumber = c.ContactUser.NominalRoll.ServiceNumber,
                FullName = c.ContactUser.NominalRoll.FullName,
                PhoneNumber = c.ContactUser.PhoneNumber,
                DisplayName = c.ContactUser.DisplayName,
                ProfilePictureUrl = c.ContactUser.ProfilePictureUrl,
                About = c.ContactUser.About,
                LastSeen = c.ContactUser.LastSeen,
                IsOnline = c.ContactUser.IsOnline,
                Department = c.ContactUser.NominalRoll.Department,
                RankPosition = c.ContactUser.NominalRoll.RankPosition
            }
        }));
    }

    [HttpGet("favorites")]
    public async Task<ActionResult<IEnumerable<ContactDto>>> GetFavorites()
    {
        var userId = GetUserId();
        var contacts = await _contactService.GetFavoriteContactsAsync(userId);

        return Ok(contacts.Select(c => new ContactDto
        {
            Id = c.Id,
            ContactUserId = c.ContactUserId,
            Nickname = c.Nickname,
            IsFavorite = c.IsFavorite,
            User = new UserDto
            {
                Id = c.ContactUser.Id,
                ServiceNumber = c.ContactUser.NominalRoll.ServiceNumber,
                FullName = c.ContactUser.NominalRoll.FullName,
                PhoneNumber = c.ContactUser.PhoneNumber,
                DisplayName = c.ContactUser.DisplayName,
                ProfilePictureUrl = c.ContactUser.ProfilePictureUrl,
                About = c.ContactUser.About,
                LastSeen = c.ContactUser.LastSeen,
                IsOnline = c.ContactUser.IsOnline,
                Department = c.ContactUser.NominalRoll.Department,
                RankPosition = c.ContactUser.NominalRoll.RankPosition
            }
        }));
    }

    [HttpPost]
    public async Task<ActionResult<ContactDto>> AddContact([FromBody] AddContactRequest request)
    {
        var userId = GetUserId();
        var contact = await _contactService.AddContactAsync(userId, request.ContactUserId, request.Nickname);

        if (contact == null)
        {
            return BadRequest(new { message = "Failed to add contact" });
        }

        return Ok(new ContactDto
        {
            Id = contact.Id,
            ContactUserId = contact.ContactUserId,
            Nickname = contact.Nickname,
            IsFavorite = contact.IsFavorite,
            User = new UserDto
            {
                Id = contact.ContactUser.Id,
                ServiceNumber = contact.ContactUser.NominalRoll.ServiceNumber,
                FullName = contact.ContactUser.NominalRoll.FullName,
                PhoneNumber = contact.ContactUser.PhoneNumber,
                DisplayName = contact.ContactUser.DisplayName,
                ProfilePictureUrl = contact.ContactUser.ProfilePictureUrl,
                About = contact.ContactUser.About,
                LastSeen = contact.ContactUser.LastSeen,
                IsOnline = contact.ContactUser.IsOnline,
                Department = contact.ContactUser.NominalRoll.Department,
                RankPosition = contact.ContactUser.NominalRoll.RankPosition
            }
        });
    }

    [HttpPut("{contactUserId}")]
    public async Task<ActionResult> UpdateContact(Guid contactUserId, [FromBody] UpdateContactRequest request)
    {
        var userId = GetUserId();
        var success = await _contactService.UpdateContactAsync(userId, contactUserId, request.Nickname, request.IsFavorite);

        if (!success)
        {
            return BadRequest(new { message = "Failed to update contact" });
        }

        return Ok(new { message = "Contact updated successfully" });
    }

    [HttpDelete("{contactUserId}")]
    public async Task<ActionResult> RemoveContact(Guid contactUserId)
    {
        var userId = GetUserId();
        var success = await _contactService.RemoveContactAsync(userId, contactUserId);

        if (!success)
        {
            return BadRequest(new { message = "Failed to remove contact" });
        }

        return Ok(new { message = "Contact removed successfully" });
    }

    [HttpPost("sync")]
    public async Task<ActionResult<IEnumerable<ContactDto>>> SyncContacts([FromBody] SyncContactsRequest request)
    {
        var userId = GetUserId();
        var contacts = await _contactService.SyncContactsAsync(userId, request.PhoneNumbers);

        return Ok(contacts.Select(c => new ContactDto
        {
            Id = c.Id,
            ContactUserId = c.ContactUserId,
            Nickname = c.Nickname,
            IsFavorite = c.IsFavorite,
            User = new UserDto
            {
                Id = c.ContactUser.Id,
                ServiceNumber = c.ContactUser.NominalRoll.ServiceNumber,
                FullName = c.ContactUser.NominalRoll.FullName,
                PhoneNumber = c.ContactUser.PhoneNumber,
                DisplayName = c.ContactUser.DisplayName,
                ProfilePictureUrl = c.ContactUser.ProfilePictureUrl,
                About = c.ContactUser.About,
                LastSeen = c.ContactUser.LastSeen,
                IsOnline = c.ContactUser.IsOnline,
                Department = c.ContactUser.NominalRoll.Department,
                RankPosition = c.ContactUser.NominalRoll.RankPosition
            }
        }));
    }
}
