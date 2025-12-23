using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using IM.API.DTOs;
using IM.Core.Interfaces;
using System.Security.Claims;

namespace IM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StatusController : ControllerBase
{
    private readonly IStatusService _statusService;
    private readonly IContactService _contactService;
    private readonly IUserService _userService;

    public StatusController(IStatusService statusService, IContactService contactService, IUserService userService)
    {
        _statusService = statusService;
        _contactService = contactService;
        _userService = userService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserStatusesDto>>> GetContactStatuses()
    {
        var userId = GetUserId();
        var statuses = await _statusService.GetContactStatusesAsync(userId);

        // Group by user
        var groupedStatuses = statuses
            .GroupBy(s => s.UserId)
            .Select(g =>
            {
                var user = g.First().User;
                var statusList = g.Select(s => new StatusDto
                {
                    Id = s.Id,
                    UserId = s.UserId,
                    TextContent = s.TextContent,
                    MediaUrl = s.MediaUrl,
                    MediaType = s.MediaType,
                    BackgroundColor = s.BackgroundColor,
                    CreatedAt = s.CreatedAt,
                    ExpiresAt = s.ExpiresAt,
                    ViewCount = s.Views.Count,
                    IsViewed = s.Views.Any(v => v.ViewerId == userId)
                }).ToList();

                return new UserStatusesDto
                {
                    User = new UserDto
                    {
                        Id = user.Id,
                        ServiceNumber = user.NominalRoll.ServiceNumber,
                        FullName = user.NominalRoll.FullName,
                        PhoneNumber = user.PhoneNumber,
                        DisplayName = user.DisplayName,
                        ProfilePictureUrl = user.ProfilePictureUrl,
                        IsOnline = user.IsOnline
                    },
                    Statuses = statusList,
                    HasUnviewed = statusList.Any(s => !s.IsViewed)
                };
            })
            .OrderByDescending(us => us.HasUnviewed)
            .ThenByDescending(us => us.Statuses.Max(s => s.CreatedAt))
            .ToList();

        return Ok(groupedStatuses);
    }

    [HttpGet("mine")]
    public async Task<ActionResult<IEnumerable<StatusDto>>> GetMyStatuses()
    {
        var userId = GetUserId();
        var statuses = await _statusService.GetUserStatusesAsync(userId);

        return Ok(statuses.Select(s => new StatusDto
        {
            Id = s.Id,
            UserId = s.UserId,
            TextContent = s.TextContent,
            MediaUrl = s.MediaUrl,
            MediaType = s.MediaType,
            BackgroundColor = s.BackgroundColor,
            CreatedAt = s.CreatedAt,
            ExpiresAt = s.ExpiresAt,
            ViewCount = s.Views.Count,
            Views = s.Views.Select(v => new StatusViewDto
            {
                ViewerId = v.ViewerId,
                ViewerName = v.Viewer?.DisplayName ?? v.Viewer?.NominalRoll.FullName,
                ViewerProfilePicture = v.Viewer?.ProfilePictureUrl,
                ViewedAt = v.ViewedAt
            }).ToList()
        }));
    }

    [HttpPost]
    public async Task<ActionResult<StatusDto>> CreateStatus([FromBody] CreateStatusRequest request)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(request.TextContent) && string.IsNullOrWhiteSpace(request.MediaUrl))
        {
            return BadRequest(new { message = "Status must have text content or media" });
        }

        var status = await _statusService.CreateStatusAsync(
            userId,
            request.TextContent,
            request.MediaUrl,
            request.MediaType,
            request.BackgroundColor);

        return Ok(new StatusDto
        {
            Id = status.Id,
            UserId = status.UserId,
            TextContent = status.TextContent,
            MediaUrl = status.MediaUrl,
            MediaType = status.MediaType,
            BackgroundColor = status.BackgroundColor,
            CreatedAt = status.CreatedAt,
            ExpiresAt = status.ExpiresAt,
            ViewCount = 0
        });
    }

    [HttpPost("{id}/view")]
    public async Task<ActionResult> ViewStatus(Guid id)
    {
        var userId = GetUserId();
        var success = await _statusService.ViewStatusAsync(id, userId);

        if (!success)
        {
            return BadRequest(new { message = "Failed to view status" });
        }

        return Ok(new { message = "Status viewed" });
    }

    [HttpGet("{id}/views")]
    public async Task<ActionResult<IEnumerable<StatusViewDto>>> GetStatusViews(Guid id)
    {
        var userId = GetUserId();
        var views = await _statusService.GetStatusViewsAsync(id, userId);

        return Ok(views.Select(v => new StatusViewDto
        {
            ViewerId = v.ViewerId,
            ViewerName = v.Viewer?.DisplayName ?? v.Viewer?.NominalRoll.FullName,
            ViewerProfilePicture = v.Viewer?.ProfilePictureUrl,
            ViewedAt = v.ViewedAt
        }));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteStatus(Guid id)
    {
        var userId = GetUserId();
        var success = await _statusService.DeleteStatusAsync(id, userId);

        if (!success)
        {
            return BadRequest(new { message = "Failed to delete status" });
        }

        return Ok(new { message = "Status deleted" });
    }
}
