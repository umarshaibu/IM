using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using IM.API.DTOs;
using IM.Core.Interfaces;
using System.Security.Claims;

namespace IM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetAllUsers()
    {
        var currentUserId = GetUserId();
        var users = await _userService.GetAllUsersAsync(currentUserId);

        return Ok(users.Select(u => new UserDto
        {
            Id = u.Id,
            ServiceNumber = u.NominalRoll.ServiceNumber,
            FullName = u.NominalRoll.FullName,
            PhoneNumber = u.PhoneNumber,
            Email = u.Email ?? u.NominalRoll.Email,
            DisplayName = u.DisplayName,
            ProfilePictureUrl = u.ProfilePictureUrl,
            About = u.About,
            LastSeen = u.LastSeen,
            IsOnline = u.IsOnline,
            Department = u.NominalRoll.Department,
            RankPosition = u.NominalRoll.RankPosition
        }));
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserProfileDto>> GetCurrentUser()
    {
        var userId = GetUserId();
        var user = await _userService.GetUserByIdAsync(userId);

        if (user == null)
        {
            return NotFound();
        }

        return Ok(new UserProfileDto
        {
            Id = user.Id,
            ServiceNumber = user.NominalRoll.ServiceNumber,
            FullName = user.NominalRoll.FullName,
            PhoneNumber = user.PhoneNumber,
            Email = user.Email ?? user.NominalRoll.Email,
            DisplayName = user.DisplayName,
            ProfilePictureUrl = user.ProfilePictureUrl,
            About = user.About,
            LastSeen = user.LastSeen,
            IsOnline = user.IsOnline,
            Department = user.NominalRoll.Department,
            RankPosition = user.NominalRoll.RankPosition,
            ShowLastSeen = user.ShowLastSeen,
            ShowProfilePhoto = user.ShowProfilePhoto,
            ShowAbout = user.ShowAbout,
            ReadReceipts = user.ReadReceipts,
            PublicKey = user.PublicKey
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> GetUser(Guid id)
    {
        var currentUserId = GetUserId();
        var user = await _userService.GetUserByIdAsync(id);

        if (user == null)
        {
            return NotFound();
        }

        var isBlocked = await _userService.IsBlockedAsync(currentUserId, id);

        return Ok(new UserDto
        {
            Id = user.Id,
            ServiceNumber = user.NominalRoll.ServiceNumber,
            FullName = user.NominalRoll.FullName,
            PhoneNumber = user.PhoneNumber,
            Email = user.Email ?? user.NominalRoll.Email,
            DisplayName = user.DisplayName,
            ProfilePictureUrl = user.ShowProfilePhoto && !isBlocked ? user.ProfilePictureUrl : null,
            About = user.ShowAbout && !isBlocked ? user.About : null,
            LastSeen = user.ShowLastSeen && !isBlocked ? user.LastSeen : null,
            IsOnline = !isBlocked && user.IsOnline,
            Department = user.NominalRoll.Department,
            RankPosition = user.NominalRoll.RankPosition
        });
    }

    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<UserDto>>> SearchUsers([FromQuery] string query)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
        {
            return BadRequest(new { message = "Search query must be at least 2 characters" });
        }

        var currentUserId = GetUserId();
        var users = await _userService.SearchUsersAsync(query, currentUserId);

        return Ok(users.Select(u => new UserDto
        {
            Id = u.Id,
            ServiceNumber = u.NominalRoll.ServiceNumber,
            FullName = u.NominalRoll.FullName,
            PhoneNumber = u.PhoneNumber,
            Email = u.Email ?? u.NominalRoll.Email,
            DisplayName = u.DisplayName,
            ProfilePictureUrl = u.ProfilePictureUrl,
            About = u.About,
            LastSeen = u.LastSeen,
            IsOnline = u.IsOnline,
            Department = u.NominalRoll.Department,
            RankPosition = u.NominalRoll.RankPosition
        }));
    }

    [HttpPut("profile")]
    public async Task<ActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = GetUserId();
        var success = await _userService.UpdateProfileAsync(
            userId,
            request.DisplayName,
            request.About,
            request.ProfilePictureUrl);

        if (!success)
        {
            return BadRequest(new { message = "Failed to update profile" });
        }

        // Return the updated user data so the mobile app can update its state
        var user = await _userService.GetUserByIdAsync(userId);
        if (user == null)
        {
            return BadRequest(new { message = "Failed to retrieve updated profile" });
        }

        return Ok(new UserProfileDto
        {
            Id = user.Id,
            ServiceNumber = user.NominalRoll.ServiceNumber,
            FullName = user.NominalRoll.FullName,
            PhoneNumber = user.PhoneNumber,
            Email = user.Email ?? user.NominalRoll.Email,
            DisplayName = user.DisplayName,
            ProfilePictureUrl = user.ProfilePictureUrl,
            About = user.About,
            LastSeen = user.LastSeen,
            IsOnline = user.IsOnline,
            Department = user.NominalRoll.Department,
            RankPosition = user.NominalRoll.RankPosition,
            ShowLastSeen = user.ShowLastSeen,
            ShowProfilePhoto = user.ShowProfilePhoto,
            ShowAbout = user.ShowAbout,
            ReadReceipts = user.ReadReceipts,
            PublicKey = user.PublicKey
        });
    }

    [HttpPut("privacy")]
    public async Task<ActionResult> UpdatePrivacy([FromBody] UpdatePrivacyRequest request)
    {
        var userId = GetUserId();
        var success = await _userService.UpdatePrivacySettingsAsync(
            userId,
            request.ShowLastSeen,
            request.ShowProfilePhoto,
            request.ShowAbout,
            request.ReadReceipts);

        if (!success)
        {
            return BadRequest(new { message = "Failed to update privacy settings" });
        }

        return Ok(new { message = "Privacy settings updated successfully" });
    }

    [HttpPut("public-key")]
    public async Task<ActionResult> UpdatePublicKey([FromBody] UpdatePublicKeyRequest request)
    {
        var userId = GetUserId();
        var success = await _userService.UpdatePublicKeyAsync(userId, request.PublicKey);

        if (!success)
        {
            return BadRequest(new { message = "Failed to update public key" });
        }

        return Ok(new { message = "Public key updated successfully" });
    }

    [HttpPost("block/{blockedUserId}")]
    public async Task<ActionResult> BlockUser(Guid blockedUserId)
    {
        var userId = GetUserId();
        var success = await _userService.BlockUserAsync(userId, blockedUserId);

        if (!success)
        {
            return BadRequest(new { message = "Failed to block user" });
        }

        return Ok(new { message = "User blocked successfully" });
    }

    [HttpDelete("block/{blockedUserId}")]
    public async Task<ActionResult> UnblockUser(Guid blockedUserId)
    {
        var userId = GetUserId();
        var success = await _userService.UnblockUserAsync(userId, blockedUserId);

        if (!success)
        {
            return BadRequest(new { message = "Failed to unblock user" });
        }

        return Ok(new { message = "User unblocked successfully" });
    }

    [HttpGet("blocked")]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetBlockedUsers()
    {
        var userId = GetUserId();
        var blockedUsers = await _userService.GetBlockedUsersAsync(userId);

        return Ok(blockedUsers.Select(u => new UserDto
        {
            Id = u.Id,
            ServiceNumber = u.NominalRoll.ServiceNumber,
            FullName = u.NominalRoll.FullName,
            PhoneNumber = u.PhoneNumber,
            Email = u.Email ?? u.NominalRoll.Email,
            DisplayName = u.DisplayName,
            ProfilePictureUrl = u.ProfilePictureUrl,
            Department = u.NominalRoll.Department,
            RankPosition = u.NominalRoll.RankPosition
        }));
    }
}
