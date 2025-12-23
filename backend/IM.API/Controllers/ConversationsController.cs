using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using IM.API.DTOs;
using IM.Core.Enums;
using IM.Core.Interfaces;
using System.Security.Claims;

namespace IM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ConversationsController : ControllerBase
{
    private readonly IConversationService _conversationService;
    private readonly IMessageService _messageService;
    private readonly IUserService _userService;
    private readonly IEncryptionService _encryptionService;

    public ConversationsController(
        IConversationService conversationService,
        IMessageService messageService,
        IUserService userService,
        IEncryptionService encryptionService)
    {
        _conversationService = conversationService;
        _messageService = messageService;
        _userService = userService;
        _encryptionService = encryptionService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ConversationDto>>> GetConversations()
    {
        var userId = GetUserId();
        var conversations = await _conversationService.GetUserConversationsAsync(userId);

        var result = conversations.Select(c => MapToDto(c, userId)).ToList();
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ConversationDto>> GetConversation(Guid id)
    {
        var userId = GetUserId();
        var conversation = await _conversationService.GetConversationByIdAsync(id, userId);

        if (conversation == null)
        {
            return NotFound();
        }

        return Ok(MapToDto(conversation, userId));
    }

    [HttpPost("private/{otherUserId}")]
    public async Task<ActionResult<ConversationDto>> GetOrCreatePrivateConversation(Guid otherUserId)
    {
        var userId = GetUserId();

        // Check if blocked
        var isBlocked = await _userService.IsBlockedAsync(userId, otherUserId);
        if (isBlocked)
        {
            return BadRequest(new { message = "Cannot start conversation with this user" });
        }

        var conversation = await _conversationService.GetOrCreatePrivateConversationAsync(userId, otherUserId);
        var fullConversation = await _conversationService.GetConversationByIdAsync(conversation.Id, userId);

        return Ok(MapToDto(fullConversation!, userId));
    }

    [HttpPost("group")]
    public async Task<ActionResult<ConversationDto>> CreateGroupConversation([FromBody] CreateGroupRequest request)
    {
        var userId = GetUserId();

        if (request.MemberIds.Count < 1)
        {
            return BadRequest(new { message = "A group must have at least one other member" });
        }

        var conversation = await _conversationService.CreateGroupConversationAsync(
            userId,
            request.Name,
            request.Description,
            request.MemberIds);

        var fullConversation = await _conversationService.GetConversationByIdAsync(conversation.Id, userId);

        return Ok(MapToDto(fullConversation!, userId));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateConversation(Guid id, [FromBody] UpdateGroupRequest request)
    {
        var userId = GetUserId();
        var success = await _conversationService.UpdateConversationAsync(
            id,
            userId,
            request.Name,
            request.Description,
            request.IconUrl);

        if (!success)
        {
            return BadRequest(new { message = "Failed to update conversation. You may not have permission." });
        }

        return Ok(new { message = "Conversation updated successfully" });
    }

    [HttpPost("{id}/participants")]
    public async Task<ActionResult> AddParticipant(Guid id, [FromBody] AddParticipantRequest request)
    {
        var userId = GetUserId();
        var success = await _conversationService.AddParticipantAsync(id, request.UserId, userId);

        if (!success)
        {
            return BadRequest(new { message = "Failed to add participant. You may not have permission." });
        }

        return Ok(new { message = "Participant added successfully" });
    }

    [HttpDelete("{id}/participants/{participantUserId}")]
    public async Task<ActionResult> RemoveParticipant(Guid id, Guid participantUserId)
    {
        var userId = GetUserId();
        var success = await _conversationService.RemoveParticipantAsync(id, participantUserId, userId);

        if (!success)
        {
            return BadRequest(new { message = "Failed to remove participant. You may not have permission." });
        }

        return Ok(new { message = "Participant removed successfully" });
    }

    [HttpPost("{id}/leave")]
    public async Task<ActionResult> LeaveConversation(Guid id)
    {
        var userId = GetUserId();
        var success = await _conversationService.LeaveConversationAsync(id, userId);

        if (!success)
        {
            return BadRequest(new { message = "Failed to leave conversation" });
        }

        return Ok(new { message = "Left conversation successfully" });
    }

    [HttpPut("{id}/participants/{participantUserId}/role")]
    public async Task<ActionResult> UpdateParticipantRole(Guid id, Guid participantUserId, [FromBody] UpdateParticipantRoleRequest request)
    {
        var userId = GetUserId();
        var success = await _conversationService.UpdateParticipantRoleAsync(id, participantUserId, userId, request.Role);

        if (!success)
        {
            return BadRequest(new { message = "Failed to update role. You may not have permission." });
        }

        return Ok(new { message = "Role updated successfully" });
    }

    [HttpPut("{id}/expiry")]
    public async Task<ActionResult> SetMessageExpiry(Guid id, [FromBody] SetMessageExpiryRequest request)
    {
        var userId = GetUserId();
        var success = await _conversationService.SetMessageExpiryAsync(id, userId, request.Expiry);

        if (!success)
        {
            return BadRequest(new { message = "Failed to set message expiry" });
        }

        return Ok(new { message = "Message expiry updated successfully" });
    }

    [HttpPut("{id}/mute")]
    public async Task<ActionResult> MuteConversation(Guid id, [FromBody] MuteConversationRequest request)
    {
        var userId = GetUserId();
        var success = await _conversationService.MuteConversationAsync(id, userId, request.Until);

        if (!success)
        {
            return BadRequest(new { message = "Failed to mute conversation" });
        }

        return Ok(new { message = "Conversation muted successfully" });
    }

    [HttpPut("{id}/archive")]
    public async Task<ActionResult> ArchiveConversation(Guid id, [FromQuery] bool archive = true)
    {
        var userId = GetUserId();
        var success = await _conversationService.ArchiveConversationAsync(id, userId, archive);

        if (!success)
        {
            return BadRequest(new { message = "Failed to archive conversation" });
        }

        return Ok(new { message = archive ? "Conversation archived" : "Conversation unarchived" });
    }

    [HttpGet("{id}/messages")]
    public async Task<ActionResult<IEnumerable<MessageDto>>> GetMessages(Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var userId = GetUserId();
        var conversation = await _conversationService.GetConversationByIdAsync(id, userId);

        if (conversation == null)
        {
            return NotFound();
        }

        var messages = await _messageService.GetConversationMessagesAsync(id, page, pageSize);

        return Ok(messages.Select(m => new MessageDto
        {
            Id = m.Id,
            ConversationId = m.ConversationId,
            SenderId = m.SenderId,
            SenderName = m.Sender?.DisplayName ?? m.Sender?.NominalRoll.FullName,
            SenderProfilePicture = m.Sender?.ProfilePictureUrl,
            Type = m.Type,
            Content = m.Content,
            MediaUrl = m.MediaUrl,
            MediaThumbnailUrl = m.MediaThumbnailUrl,
            MediaMimeType = m.MediaMimeType,
            MediaSize = m.MediaSize,
            MediaDuration = m.MediaDuration,
            ReplyToMessageId = m.ReplyToMessageId,
            IsForwarded = m.IsForwarded,
            IsEdited = m.IsEdited,
            EditedAt = m.EditedAt,
            IsDeleted = m.IsDeleted,
            CreatedAt = m.CreatedAt,
            ExpiresAt = m.ExpiresAt,
            Statuses = m.Statuses.Select(s => new MessageStatusDto
            {
                UserId = s.UserId,
                Status = s.Status,
                DeliveredAt = s.DeliveredAt,
                ReadAt = s.ReadAt
            }).ToList()
        }));
    }

    [HttpGet("{id}/participants")]
    public async Task<ActionResult<IEnumerable<ParticipantDto>>> GetParticipants(Guid id)
    {
        var userId = GetUserId();
        var conversation = await _conversationService.GetConversationByIdAsync(id, userId);

        if (conversation == null)
        {
            return NotFound();
        }

        var participants = await _conversationService.GetParticipantsAsync(id);

        return Ok(participants.Select(p => new ParticipantDto
        {
            UserId = p.UserId,
            DisplayName = p.User.DisplayName,
            FullName = p.User.NominalRoll.FullName,
            ProfilePictureUrl = p.User.ProfilePictureUrl,
            PhoneNumber = p.User.PhoneNumber,
            Role = p.Role,
            IsOnline = p.User.IsOnline,
            LastSeen = p.User.LastSeen,
            JoinedAt = p.JoinedAt
        }));
    }

    private ConversationDto MapToDto(Core.Entities.Conversation conversation, Guid currentUserId)
    {
        var lastMessage = conversation.Messages.FirstOrDefault();
        var participant = conversation.Participants.FirstOrDefault(p => p.UserId == currentUserId);

        return new ConversationDto
        {
            Id = conversation.Id,
            Type = conversation.Type,
            Name = conversation.Type == ConversationType.Private
                ? conversation.Participants.FirstOrDefault(p => p.UserId != currentUserId)?.User.DisplayName
                  ?? conversation.Participants.FirstOrDefault(p => p.UserId != currentUserId)?.User.NominalRoll.FullName
                : conversation.Name,
            Description = conversation.Description,
            IconUrl = conversation.Type == ConversationType.Private
                ? conversation.Participants.FirstOrDefault(p => p.UserId != currentUserId)?.User.ProfilePictureUrl
                : conversation.IconUrl,
            DefaultMessageExpiry = conversation.DefaultMessageExpiry,
            IsArchived = conversation.IsArchived,
            IsMuted = participant?.IsMuted ?? false,
            MutedUntil = participant?.MutedUntil,
            LastMessageAt = conversation.LastMessageAt,
            LastMessage = lastMessage != null ? new MessageDto
            {
                Id = lastMessage.Id,
                SenderId = lastMessage.SenderId,
                Type = lastMessage.Type,
                Content = !string.IsNullOrEmpty(lastMessage.Content)
                    ? _encryptionService.Decrypt(lastMessage.Content)
                    : lastMessage.Content,
                CreatedAt = lastMessage.CreatedAt,
                IsDeleted = lastMessage.IsDeleted
            } : null,
            Participants = conversation.Participants.Where(p => p.IsActive).Select(p => new ParticipantDto
            {
                UserId = p.UserId,
                DisplayName = p.User.DisplayName,
                FullName = p.User.NominalRoll.FullName,
                ProfilePictureUrl = p.User.ProfilePictureUrl,
                PhoneNumber = p.User.PhoneNumber,
                Role = p.Role,
                IsOnline = p.User.IsOnline,
                LastSeen = p.User.LastSeen,
                JoinedAt = p.JoinedAt
            }).ToList(),
            CreatedAt = conversation.CreatedAt
        };
    }
}
