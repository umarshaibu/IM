using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using IM.API.DTOs;
using IM.Core.Interfaces;
using System.Security.Claims;

namespace IM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CallsController : ControllerBase
{
    private readonly ICallService _callService;
    private readonly IUserService _userService;
    private readonly IConfiguration _configuration;

    public CallsController(ICallService callService, IUserService userService, IConfiguration configuration)
    {
        _callService = callService;
        _userService = userService;
        _configuration = configuration;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CallDto>>> GetCallHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();
        var calls = await _callService.GetCallHistoryAsync(userId, page, pageSize);

        return Ok(calls.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CallDto>> GetCall(Guid id)
    {
        var call = await _callService.GetCallByIdAsync(id);

        if (call == null)
        {
            return NotFound();
        }

        return Ok(MapToDto(call));
    }

    [HttpGet("active/{conversationId}")]
    public async Task<ActionResult<CallDto?>> GetActiveCall(Guid conversationId)
    {
        var call = await _callService.GetActiveCallAsync(conversationId);

        if (call == null)
        {
            return Ok(null);
        }

        return Ok(MapToDto(call));
    }

    [HttpPost("initiate")]
    public async Task<ActionResult<InitiateCallResponse>> InitiateCall([FromBody] InitiateCallRequest request)
    {
        var userId = GetUserId();

        try
        {
            var (call, roomToken) = await _callService.InitiateCallAsync(
                request.ConversationId,
                userId,
                request.Type);

            var liveKitUrl = _configuration.GetSection("LiveKit")["Host"] ?? "http://localhost:7880";

            return Ok(new InitiateCallResponse
            {
                Call = MapToDto(call),
                RoomToken = roomToken,
                LiveKitUrl = liveKitUrl
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/join")]
    public async Task<ActionResult<JoinCallResponse>> JoinCall(Guid id)
    {
        var userId = GetUserId();
        var (success, roomToken) = await _callService.JoinCallAsync(id, userId);

        if (!success || roomToken == null)
        {
            return BadRequest(new { message = "Failed to join call" });
        }

        var call = await _callService.GetCallByIdAsync(id);
        var liveKitUrl = _configuration.GetSection("LiveKit")["Host"] ?? "http://localhost:7880";

        return Ok(new JoinCallResponse
        {
            RoomToken = roomToken,
            RoomId = call!.RoomId!,
            LiveKitUrl = liveKitUrl
        });
    }

    [HttpPost("{id}/decline")]
    public async Task<ActionResult> DeclineCall(Guid id)
    {
        var userId = GetUserId();
        var success = await _callService.DeclineCallAsync(id, userId);

        if (!success)
        {
            return BadRequest(new { message = "Failed to decline call" });
        }

        return Ok(new { message = "Call declined" });
    }

    [HttpPost("{id}/end")]
    public async Task<ActionResult> EndCall(Guid id)
    {
        var userId = GetUserId();
        var success = await _callService.EndCallAsync(id, userId);

        if (!success)
        {
            return BadRequest(new { message = "Failed to end call" });
        }

        return Ok(new { message = "Call ended" });
    }

    [HttpPut("{id}/status")]
    public async Task<ActionResult> UpdateCallStatus(Guid id, [FromBody] UpdateCallStatusRequest request)
    {
        var userId = GetUserId();
        var success = await _callService.UpdateParticipantStatusAsync(id, userId, request.IsMuted, request.IsVideoEnabled);

        if (!success)
        {
            return BadRequest(new { message = "Failed to update call status" });
        }

        return Ok(new { message = "Call status updated" });
    }

    private static CallDto MapToDto(Core.Entities.Call call)
    {
        return new CallDto
        {
            Id = call.Id,
            ConversationId = call.ConversationId,
            InitiatorId = call.InitiatorId,
            InitiatorName = call.Initiator?.DisplayName ?? call.Initiator?.NominalRoll.FullName,
            InitiatorProfilePicture = call.Initiator?.ProfilePictureUrl,
            Type = call.Type,
            Status = call.Status,
            StartedAt = call.StartedAt,
            EndedAt = call.EndedAt,
            Duration = call.Duration,
            RoomId = call.RoomId,
            Participants = call.Participants.Select(p => new CallParticipantDto
            {
                UserId = p.UserId,
                DisplayName = p.User?.DisplayName ?? p.User?.NominalRoll.FullName,
                ProfilePictureUrl = p.User?.ProfilePictureUrl,
                Status = p.Status,
                IsMuted = p.IsMuted,
                IsVideoEnabled = p.IsVideoEnabled,
                JoinedAt = p.JoinedAt
            }).ToList()
        };
    }
}
