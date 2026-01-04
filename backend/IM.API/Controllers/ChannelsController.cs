using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IM.API.DTOs;
using IM.Core.Entities;
using IM.Core.Interfaces;
using IM.Infrastructure.Data;
using System.Security.Claims;

namespace IM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChannelsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IEncryptionService _encryptionService;

    public ChannelsController(ApplicationDbContext context, INotificationService notificationService, IEncryptionService encryptionService)
    {
        _context = context;
        _notificationService = notificationService;
        _encryptionService = encryptionService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

    // GET: api/channels
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ChannelDto>>> GetChannels([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        try
        {
            var userId = GetUserId();

            var query = _context.Channels
                .Include(c => c.Owner)
                    .ThenInclude(o => o.NominalRoll)
                .Include(c => c.Followers)
                .Where(c => c.IsPublic)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(c => c.Name.ToLower().Contains(search.ToLower()) ||
                                         (c.Description != null && c.Description.ToLower().Contains(search.ToLower())));
            }

            var channels = await query
                .OrderByDescending(c => c.FollowerCount)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new ChannelDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    ShortName = c.ShortName ?? c.Name,
                    Description = c.Description,
                    IconUrl = c.IconUrl,
                    OwnerId = c.OwnerId,
                    OwnerName = c.Owner != null
                        ? (c.Owner.DisplayName ?? (c.Owner.NominalRoll != null ? c.Owner.NominalRoll.FullName : "Unknown"))
                        : "Unknown",
                    IsPublic = c.IsPublic,
                    IsVerified = c.IsVerified,
                    FollowerCount = c.FollowerCount,
                    IsFollowing = c.Followers.Any(f => f.UserId == userId),
                    IsMuted = c.Followers.Any(f => f.UserId == userId && f.IsMuted),
                    LastPostAt = c.LastPostAt,
                    CreatedAt = c.CreatedAt
                })
                .ToListAsync();

            return Ok(channels);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to load channels", error = ex.Message });
        }
    }

    // GET: api/channels/following
    [HttpGet("following")]
    public async Task<ActionResult<IEnumerable<ChannelDto>>> GetFollowingChannels()
    {
        var userId = GetUserId();

        var channels = await _context.ChannelFollowers
            .Include(cf => cf.Channel)
                .ThenInclude(c => c.Owner)
                    .ThenInclude(o => o.NominalRoll)
            .Where(cf => cf.UserId == userId)
            .OrderByDescending(cf => cf.Channel.LastPostAt)
            .Select(cf => new ChannelDto
            {
                Id = cf.Channel.Id,
                Name = cf.Channel.Name,
                ShortName = cf.Channel.ShortName,
                Description = cf.Channel.Description,
                IconUrl = cf.Channel.IconUrl,
                OwnerId = cf.Channel.OwnerId,
                OwnerName = cf.Channel.Owner != null
                    ? (cf.Channel.Owner.DisplayName ?? (cf.Channel.Owner.NominalRoll != null ? cf.Channel.Owner.NominalRoll.FullName : "Unknown"))
                    : "Unknown",
                IsPublic = cf.Channel.IsPublic,
                IsVerified = cf.Channel.IsVerified,
                FollowerCount = cf.Channel.FollowerCount,
                IsFollowing = true,
                IsMuted = cf.IsMuted,
                LastPostAt = cf.Channel.LastPostAt,
                CreatedAt = cf.Channel.CreatedAt
            })
            .ToListAsync();

        return Ok(channels);
    }

    // GET: api/channels/owned
    [HttpGet("owned")]
    public async Task<ActionResult<IEnumerable<ChannelDto>>> GetOwnedChannels()
    {
        var userId = GetUserId();

        var channels = await _context.Channels
            .Include(c => c.Owner)
                .ThenInclude(o => o.NominalRoll)
            .Include(c => c.Followers)
            .Where(c => c.OwnerId == userId)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new ChannelDto
            {
                Id = c.Id,
                Name = c.Name,
                ShortName = c.ShortName,
                Description = c.Description,
                IconUrl = c.IconUrl,
                OwnerId = c.OwnerId,
                OwnerName = c.Owner != null
                    ? (c.Owner.DisplayName ?? (c.Owner.NominalRoll != null ? c.Owner.NominalRoll.FullName : "Unknown"))
                    : "Unknown",
                IsPublic = c.IsPublic,
                IsVerified = c.IsVerified,
                FollowerCount = c.FollowerCount,
                IsFollowing = c.Followers.Any(f => f.UserId == userId),
                IsMuted = false,
                LastPostAt = c.LastPostAt,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();

        return Ok(channels);
    }

    // GET: api/channels/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<ChannelDto>> GetChannel(Guid id)
    {
        var userId = GetUserId();

        var channel = await _context.Channels
            .Include(c => c.Owner)
                .ThenInclude(o => o.NominalRoll)
            .Include(c => c.Followers)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (channel == null)
        {
            return NotFound(new { message = "Channel not found" });
        }

        return Ok(new ChannelDto
        {
            Id = channel.Id,
            Name = channel.Name,
            ShortName = channel.ShortName,
            Description = channel.Description,
            IconUrl = channel.IconUrl,
            OwnerId = channel.OwnerId,
            OwnerName = channel.Owner != null
                ? (channel.Owner.DisplayName ?? (channel.Owner.NominalRoll != null ? channel.Owner.NominalRoll.FullName : "Unknown"))
                : "Unknown",
            IsPublic = channel.IsPublic,
            IsVerified = channel.IsVerified,
            FollowerCount = channel.FollowerCount,
            IsFollowing = channel.Followers.Any(f => f.UserId == userId),
            IsMuted = channel.Followers.Any(f => f.UserId == userId && f.IsMuted),
            LastPostAt = channel.LastPostAt,
            CreatedAt = channel.CreatedAt
        });
    }

    // POST: api/channels
    [HttpPost]
    public async Task<ActionResult<ChannelDto>> CreateChannel([FromBody] CreateChannelRequest request)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Channel name is required" });
        }

        var channel = new Channel
        {
            Name = request.Name,
            ShortName = request.ShortName,
            Description = request.Description,
            IconUrl = request.IconUrl,
            OwnerId = userId,
            IsPublic = request.IsPublic
        };

        _context.Channels.Add(channel);

        // Auto-follow your own channel
        var follower = new ChannelFollower
        {
            ChannelId = channel.Id,
            UserId = userId
        };
        _context.ChannelFollowers.Add(follower);
        channel.FollowerCount = 1;

        await _context.SaveChangesAsync();

        var user = await _context.Users
            .Include(u => u.NominalRoll)
            .FirstAsync(u => u.Id == userId);

        return Ok(new ChannelDto
        {
            Id = channel.Id,
            Name = channel.Name,
            ShortName = channel.ShortName,
            Description = channel.Description,
            IconUrl = channel.IconUrl,
            OwnerId = channel.OwnerId,
            OwnerName = user.DisplayName ?? user.NominalRoll.FullName,
            IsPublic = channel.IsPublic,
            IsVerified = channel.IsVerified,
            FollowerCount = channel.FollowerCount,
            IsFollowing = true,
            IsMuted = false,
            LastPostAt = null,
            CreatedAt = channel.CreatedAt
        });
    }

    // PUT: api/channels/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<ChannelDto>> UpdateChannel(Guid id, [FromBody] UpdateChannelRequest request)
    {
        var userId = GetUserId();

        var channel = await _context.Channels
            .Include(c => c.Owner)
                .ThenInclude(o => o.NominalRoll)
            .Include(c => c.Followers)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (channel == null)
        {
            return NotFound(new { message = "Channel not found" });
        }

        if (channel.OwnerId != userId)
        {
            return Forbid();
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            channel.Name = request.Name;
        }
        if (!string.IsNullOrWhiteSpace(request.ShortName))
        {
            channel.ShortName = request.ShortName;
        }
        if (request.Description != null)
        {
            channel.Description = request.Description;
        }
        if (request.IconUrl != null)
        {
            channel.IconUrl = request.IconUrl;
        }

        await _context.SaveChangesAsync();

        return Ok(new ChannelDto
        {
            Id = channel.Id,
            Name = channel.Name,
            ShortName = channel.ShortName,
            Description = channel.Description,
            IconUrl = channel.IconUrl,
            OwnerId = channel.OwnerId,
            OwnerName = channel.Owner != null
                ? (channel.Owner.DisplayName ?? (channel.Owner.NominalRoll != null ? channel.Owner.NominalRoll.FullName : "Unknown"))
                : "Unknown",
            IsPublic = channel.IsPublic,
            IsVerified = channel.IsVerified,
            FollowerCount = channel.FollowerCount,
            IsFollowing = channel.Followers.Any(f => f.UserId == userId),
            IsMuted = false,
            LastPostAt = channel.LastPostAt,
            CreatedAt = channel.CreatedAt
        });
    }

    // DELETE: api/channels/{id}
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteChannel(Guid id)
    {
        var userId = GetUserId();

        var channel = await _context.Channels.FindAsync(id);

        if (channel == null)
        {
            return NotFound(new { message = "Channel not found" });
        }

        if (channel.OwnerId != userId)
        {
            return Forbid();
        }

        _context.Channels.Remove(channel);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Channel deleted" });
    }

    // POST: api/channels/{id}/follow
    [HttpPost("{id}/follow")]
    public async Task<ActionResult> FollowChannel(Guid id)
    {
        var userId = GetUserId();

        var channel = await _context.Channels.FindAsync(id);
        if (channel == null)
        {
            return NotFound(new { message = "Channel not found" });
        }

        var existing = await _context.ChannelFollowers
            .FirstOrDefaultAsync(cf => cf.ChannelId == id && cf.UserId == userId);

        if (existing != null)
        {
            return BadRequest(new { message = "Already following this channel" });
        }

        var follower = new ChannelFollower
        {
            ChannelId = id,
            UserId = userId
        };

        _context.ChannelFollowers.Add(follower);
        channel.FollowerCount++;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Channel followed" });
    }

    // DELETE: api/channels/{id}/follow
    [HttpDelete("{id}/follow")]
    public async Task<ActionResult> UnfollowChannel(Guid id)
    {
        var userId = GetUserId();

        var channel = await _context.Channels.FindAsync(id);
        if (channel == null)
        {
            return NotFound(new { message = "Channel not found" });
        }

        var existing = await _context.ChannelFollowers
            .FirstOrDefaultAsync(cf => cf.ChannelId == id && cf.UserId == userId);

        if (existing == null)
        {
            return BadRequest(new { message = "Not following this channel" });
        }

        _context.ChannelFollowers.Remove(existing);
        channel.FollowerCount = Math.Max(0, channel.FollowerCount - 1);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Channel unfollowed" });
    }

    // PUT: api/channels/{id}/mute
    [HttpPut("{id}/mute")]
    public async Task<ActionResult> MuteChannel(Guid id, [FromQuery] bool mute = true)
    {
        var userId = GetUserId();

        var follower = await _context.ChannelFollowers
            .FirstOrDefaultAsync(cf => cf.ChannelId == id && cf.UserId == userId);

        if (follower == null)
        {
            return BadRequest(new { message = "You are not following this channel" });
        }

        follower.IsMuted = mute;
        await _context.SaveChangesAsync();

        return Ok(new { message = mute ? "Channel muted" : "Channel unmuted" });
    }

    // GET: api/channels/{id}/posts
    [HttpGet("{id}/posts")]
    public async Task<ActionResult<IEnumerable<ChannelPostDto>>> GetChannelPosts(Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();

        var channel = await _context.Channels.FindAsync(id);
        if (channel == null)
        {
            return NotFound(new { message = "Channel not found" });
        }

        var posts = await _context.ChannelPosts
            .Include(p => p.Channel)
            .Include(p => p.Author)
                .ThenInclude(a => a.NominalRoll)
            .Include(p => p.Reactions)
            .Where(p => p.ChannelId == id)
            .OrderByDescending(p => p.IsPinned)
            .ThenByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var postDtos = posts.Select(p => new ChannelPostDto
        {
            Id = p.Id,
            ChannelId = p.ChannelId,
            ChannelName = p.Channel.Name,
            AuthorId = p.AuthorId,
            AuthorName = p.Author.DisplayName ?? p.Author.NominalRoll.FullName,
            AuthorProfilePicture = p.Author.ProfilePictureUrl,
            Content = !string.IsNullOrEmpty(p.Content) ? _encryptionService.Decrypt(p.Content) : p.Content,
            Type = p.Type,
            MediaUrl = p.MediaUrl,
            MediaMimeType = p.MediaMimeType,
            MediaSize = p.MediaSize,
            MediaDuration = p.MediaDuration,
            ThumbnailUrl = p.ThumbnailUrl,
            ViewCount = p.ViewCount,
            ReactionCount = p.ReactionCount,
            IsPinned = p.IsPinned,
            Reactions = p.Reactions
                .GroupBy(r => r.Emoji)
                .Select(g => new ReactionSummaryDto { Emoji = g.Key, Count = g.Count() })
                .ToList(),
            MyReaction = p.Reactions.FirstOrDefault(r => r.UserId == userId)?.Emoji,
            CreatedAt = p.CreatedAt
        }).ToList();

        return Ok(postDtos);
    }

    // POST: api/channels/{id}/posts
    [HttpPost("{id}/posts")]
    public async Task<ActionResult<ChannelPostDto>> CreatePost(Guid id, [FromBody] CreateChannelPostRequest request)
    {
        var userId = GetUserId();

        var channel = await _context.Channels.FindAsync(id);
        if (channel == null)
        {
            return NotFound(new { message = "Channel not found" });
        }

        if (channel.OwnerId != userId)
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.Content) && string.IsNullOrWhiteSpace(request.MediaUrl))
        {
            return BadRequest(new { message = "Post must have content or media" });
        }

        var user = await _context.Users
            .Include(u => u.NominalRoll)
            .FirstAsync(u => u.Id == userId);

        // Encrypt content before saving
        var encryptedContent = !string.IsNullOrEmpty(request.Content)
            ? _encryptionService.Encrypt(request.Content)
            : request.Content;

        var post = new ChannelPost
        {
            ChannelId = id,
            AuthorId = userId,
            Content = encryptedContent,
            Type = request.Type,
            MediaUrl = request.MediaUrl,
            MediaMimeType = request.MediaMimeType,
            MediaSize = request.MediaSize,
            MediaDuration = request.MediaDuration,
            ThumbnailUrl = request.ThumbnailUrl
        };

        _context.ChannelPosts.Add(post);
        channel.LastPostAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Send push notifications to all followers (except muted and the author)
        var followerIds = await _context.ChannelFollowers
            .Where(f => f.ChannelId == id && !f.IsMuted && f.UserId != userId)
            .Select(f => f.UserId)
            .ToListAsync();

        if (followerIds.Any())
        {
            var authorName = user.DisplayName ?? user.NominalRoll.FullName;
            var postPreview = request.Type == IM.Core.Enums.MessageType.Text
                ? request.Content  // Use original (unencrypted) content for notification preview
                : GetPostTypePreview(request.Type);

            // Fire and forget - don't block the response
            _ = _notificationService.SendChannelPostNotificationAsync(
                id,
                channel.Name,
                post.Id,
                authorName,
                postPreview,
                followerIds
            );
        }

        return Ok(new ChannelPostDto
        {
            Id = post.Id,
            ChannelId = post.ChannelId,
            ChannelName = channel.Name,
            AuthorId = post.AuthorId,
            AuthorName = user.DisplayName ?? user.NominalRoll.FullName,
            AuthorProfilePicture = user.ProfilePictureUrl,
            Content = request.Content,  // Return original (unencrypted) content to client
            Type = post.Type,
            MediaUrl = post.MediaUrl,
            MediaMimeType = post.MediaMimeType,
            MediaSize = post.MediaSize,
            MediaDuration = post.MediaDuration,
            ThumbnailUrl = post.ThumbnailUrl,
            ViewCount = 0,
            ReactionCount = 0,
            IsPinned = false,
            Reactions = new List<ReactionSummaryDto>(),
            MyReaction = null,
            CreatedAt = post.CreatedAt
        });
    }

    private static string GetPostTypePreview(IM.Core.Enums.MessageType type)
    {
        return type switch
        {
            IM.Core.Enums.MessageType.Image => "📷 Photo",
            IM.Core.Enums.MessageType.Video => "🎥 Video",
            IM.Core.Enums.MessageType.Audio => "🎵 Audio",
            IM.Core.Enums.MessageType.Document => "📄 Document",
            _ => "New post"
        };
    }

    // DELETE: api/channels/posts/{postId}
    [HttpDelete("posts/{postId}")]
    public async Task<ActionResult> DeletePost(Guid postId)
    {
        var userId = GetUserId();

        var post = await _context.ChannelPosts
            .Include(p => p.Channel)
            .FirstOrDefaultAsync(p => p.Id == postId);

        if (post == null)
        {
            return NotFound(new { message = "Post not found" });
        }

        if (post.Channel.OwnerId != userId && post.AuthorId != userId)
        {
            return Forbid();
        }

        _context.ChannelPosts.Remove(post);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Post deleted" });
    }

    // PUT: api/channels/posts/{postId}/pin
    [HttpPut("posts/{postId}/pin")]
    public async Task<ActionResult> PinPost(Guid postId, [FromQuery] bool pin = true)
    {
        var userId = GetUserId();

        var post = await _context.ChannelPosts
            .Include(p => p.Channel)
            .FirstOrDefaultAsync(p => p.Id == postId);

        if (post == null)
        {
            return NotFound(new { message = "Post not found" });
        }

        if (post.Channel.OwnerId != userId)
        {
            return Forbid();
        }

        post.IsPinned = pin;
        await _context.SaveChangesAsync();

        return Ok(new { message = pin ? "Post pinned" : "Post unpinned" });
    }

    // POST: api/channels/posts/{postId}/react
    [HttpPost("posts/{postId}/react")]
    public async Task<ActionResult> ReactToPost(Guid postId, [FromBody] ReactToPostRequest request)
    {
        var userId = GetUserId();

        var post = await _context.ChannelPosts.FindAsync(postId);
        if (post == null)
        {
            return NotFound(new { message = "Post not found" });
        }

        var existing = await _context.ChannelPostReactions
            .FirstOrDefaultAsync(r => r.PostId == postId && r.UserId == userId);

        if (existing != null)
        {
            if (existing.Emoji == request.Emoji)
            {
                // Remove reaction
                _context.ChannelPostReactions.Remove(existing);
                post.ReactionCount = Math.Max(0, post.ReactionCount - 1);
            }
            else
            {
                // Change reaction
                existing.Emoji = request.Emoji;
            }
        }
        else
        {
            // Add reaction
            var reaction = new ChannelPostReaction
            {
                PostId = postId,
                UserId = userId,
                Emoji = request.Emoji
            };
            _context.ChannelPostReactions.Add(reaction);
            post.ReactionCount++;
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Reaction updated" });
    }

    // POST: api/channels/posts/{postId}/view
    [HttpPost("posts/{postId}/view")]
    public async Task<ActionResult> ViewPost(Guid postId)
    {
        var post = await _context.ChannelPosts.FindAsync(postId);
        if (post == null)
        {
            return NotFound(new { message = "Post not found" });
        }

        post.ViewCount++;
        await _context.SaveChangesAsync();

        return Ok(new { message = "View counted" });
    }
}
