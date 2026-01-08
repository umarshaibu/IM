using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using IM.Core.Interfaces;
using System.Security.Claims;

namespace IM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FilesController : ControllerBase
{
    private readonly IFileService _fileService;
    private readonly long _maxFileSize;

    public FilesController(IFileService fileService, IConfiguration configuration)
    {
        _fileService = fileService;
        _maxFileSize = long.Parse(configuration["FileStorage:MaxFileSize"] ?? "104857600"); // 100MB default
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

    [HttpPost("upload")]
    [RequestSizeLimit(104857600)] // 100MB
    public async Task<ActionResult> UploadFile(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file provided" });
        }

        if (file.Length > _maxFileSize)
        {
            return BadRequest(new { message = $"File size exceeds the maximum allowed size of {_maxFileSize / 1024 / 1024}MB" });
        }

        var userId = GetUserId();

        using var stream = file.OpenReadStream();
        var mediaFile = await _fileService.UploadFileAsync(userId, stream, file.FileName, file.ContentType);

        return Ok(new
        {
            id = mediaFile.Id,
            fileName = mediaFile.FileName,
            url = mediaFile.FileUrl,  // Mobile app expects 'url' for profile picture uploads
            fileUrl = mediaFile.FileUrl,
            thumbnailUrl = mediaFile.ThumbnailUrl,
            mimeType = mediaFile.MimeType,
            fileSize = mediaFile.FileSize
        });
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult> DownloadFile(Guid id)
    {
        var mediaFile = await _fileService.GetFileByIdAsync(id);
        if (mediaFile == null)
        {
            return NotFound();
        }

        var stream = await _fileService.DownloadFileAsync(id);
        if (stream == null)
        {
            return NotFound();
        }

        return File(stream, mediaFile.MimeType, mediaFile.FileName);
    }

    [HttpGet("{year}/{month}/{day}/{fileName}")]
    [AllowAnonymous]
    public async Task<ActionResult> DownloadFileByPath(string year, string month, string day, string fileName)
    {
        var stream = await _fileService.DownloadFileByPathAsync($"{year}/{month}/{day}/{fileName}");
        if (stream == null)
        {
            return NotFound();
        }

        // Determine content type from file extension
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var contentType = extension switch
        {
            ".mp4" => "video/mp4",
            ".mp3" => "audio/mpeg",
            ".m4a" => "audio/mp4",
            ".wav" => "audio/wav",
            ".ogg" => "audio/ogg",
            ".webm" => "video/webm",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".pdf" => "application/pdf",
            _ => "application/octet-stream"
        };

        return File(stream, contentType, fileName);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteFile(Guid id)
    {
        var userId = GetUserId();
        var success = await _fileService.DeleteFileAsync(id, userId);

        if (!success)
        {
            return BadRequest(new { message = "Failed to delete file" });
        }

        return Ok(new { message = "File deleted" });
    }

    [HttpGet("conversation/{conversationId}")]
    public async Task<ActionResult> GetConversationMedia(Guid conversationId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();
        var media = await _fileService.GetConversationMediaAsync(conversationId, userId, page, pageSize);

        return Ok(media.Select(m => new
        {
            Id = m.Id,
            FileName = m.FileName,
            FileUrl = m.FileUrl,
            ThumbnailUrl = m.ThumbnailUrl,
            MimeType = m.MimeType,
            FileSize = m.FileSize,
            CreatedAt = m.CreatedAt
        }));
    }
}
