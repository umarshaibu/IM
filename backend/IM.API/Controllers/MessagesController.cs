using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using IM.API.DTOs;
using IM.Core.Interfaces;
using System.Security.Claims;

namespace IM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly IMessageService _messageService;
    private readonly IConversationService _conversationService;

    public MessagesController(IMessageService messageService, IConversationService conversationService)
    {
        _messageService = messageService;
        _conversationService = conversationService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

    [HttpGet("{id}")]
    public async Task<ActionResult<MessageDto>> GetMessage(Guid id)
    {
        var userId = GetUserId();
        var message = await _messageService.GetMessageByIdAsync(id);

        if (message == null)
        {
            return NotFound();
        }

        // Verify user has access to this message's conversation
        var conversation = await _conversationService.GetConversationByIdAsync(message.ConversationId, userId);
        if (conversation == null)
        {
            return NotFound();
        }

        return Ok(new MessageDto
        {
            Id = message.Id,
            ConversationId = message.ConversationId,
            SenderId = message.SenderId,
            SenderName = message.Sender?.DisplayName ?? message.Sender?.NominalRoll.FullName,
            SenderProfilePicture = message.Sender?.ProfilePictureUrl,
            Type = message.Type,
            Content = message.Content,
            MediaUrl = message.MediaUrl,
            MediaThumbnailUrl = message.MediaThumbnailUrl,
            MediaMimeType = message.MediaMimeType,
            MediaSize = message.MediaSize,
            MediaDuration = message.MediaDuration,
            ReplyToMessageId = message.ReplyToMessageId,
            IsForwarded = message.IsForwarded,
            IsEdited = message.IsEdited,
            EditedAt = message.EditedAt,
            IsDeleted = message.IsDeleted,
            CreatedAt = message.CreatedAt,
            ExpiresAt = message.ExpiresAt,
            Statuses = message.Statuses.Select(s => new MessageStatusDto
            {
                UserId = s.UserId,
                Status = s.Status,
                DeliveredAt = s.DeliveredAt,
                ReadAt = s.ReadAt
            }).ToList()
        });
    }

    [HttpPost("{id}/delivered")]
    public async Task<ActionResult> MarkDelivered(Guid id)
    {
        var userId = GetUserId();
        var success = await _messageService.MarkAsDeliveredAsync(id, userId);

        if (!success)
        {
            return BadRequest(new { message = "Failed to mark message as delivered" });
        }

        return Ok(new { message = "Message marked as delivered" });
    }

    [HttpPost("{id}/read")]
    public async Task<ActionResult> MarkRead(Guid id)
    {
        var userId = GetUserId();
        var success = await _messageService.MarkAsReadAsync(id, userId);

        if (!success)
        {
            return BadRequest(new { message = "Failed to mark message as read" });
        }

        return Ok(new { message = "Message marked as read" });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<MessageDto>> EditMessage(Guid id, [FromBody] EditMessageRequest request)
    {
        var userId = GetUserId();
        var message = await _messageService.EditMessageAsync(id, userId, request.Content);

        if (message == null)
        {
            return BadRequest(new { message = "Failed to edit message. You may not have permission or message is not editable." });
        }

        return Ok(new MessageDto
        {
            Id = message.Id,
            ConversationId = message.ConversationId,
            SenderId = message.SenderId,
            Type = message.Type,
            Content = message.Content,
            IsEdited = message.IsEdited,
            EditedAt = message.EditedAt,
            CreatedAt = message.CreatedAt
        });
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteMessage(Guid id, [FromQuery] bool forEveryone = false)
    {
        var userId = GetUserId();
        var success = await _messageService.DeleteMessageAsync(id, userId, forEveryone);

        if (!success)
        {
            return BadRequest(new { message = "Failed to delete message" });
        }

        return Ok(new { message = "Message deleted" });
    }

    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<MessageDto>>> SearchMessages([FromQuery] string query, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
        {
            return BadRequest(new { message = "Search query must be at least 2 characters" });
        }

        var userId = GetUserId();
        var messages = await _messageService.SearchMessagesAsync(userId, query, page, pageSize);

        return Ok(messages.Select(m => new MessageDto
        {
            Id = m.Id,
            ConversationId = m.ConversationId,
            SenderId = m.SenderId,
            SenderName = m.Sender?.DisplayName ?? m.Sender?.NominalRoll.FullName,
            Type = m.Type,
            Content = m.Content,
            CreatedAt = m.CreatedAt
        }));
    }

    [HttpPost("forward")]
    public async Task<ActionResult> ForwardMessage([FromBody] ForwardMessageRequest request)
    {
        var userId = GetUserId();

        var originalMessage = await _messageService.GetMessageByIdAsync(request.MessageId);
        if (originalMessage == null)
        {
            return NotFound(new { message = "Original message not found" });
        }

        // Forward to each conversation
        foreach (var conversationId in request.ConversationIds)
        {
            var conversation = await _conversationService.GetConversationByIdAsync(conversationId, userId);
            if (conversation != null)
            {
                await _messageService.SendMessageAsync(
                    conversationId,
                    userId,
                    originalMessage.Type,
                    originalMessage.Content,
                    originalMessage.MediaUrl);
            }
        }

        return Ok(new { message = "Message forwarded successfully" });
    }
}
