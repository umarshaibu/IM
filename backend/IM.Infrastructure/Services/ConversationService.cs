using Microsoft.EntityFrameworkCore;
using IM.Core.Entities;
using IM.Core.Enums;
using IM.Core.Interfaces;
using IM.Infrastructure.Data;

namespace IM.Infrastructure.Services;

public class ConversationService : IConversationService
{
    private readonly ApplicationDbContext _context;

    public ConversationService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Conversation> GetOrCreatePrivateConversationAsync(Guid userId1, Guid userId2)
    {
        // Find existing private conversation between these two users
        var existingConversation = await _context.Conversations
            .Include(c => c.Participants)
            .Where(c => c.Type == ConversationType.Private)
            .Where(c => c.Participants.Any(p => p.UserId == userId1 && p.IsActive) &&
                       c.Participants.Any(p => p.UserId == userId2 && p.IsActive))
            .FirstOrDefaultAsync();

        if (existingConversation != null)
            return existingConversation;

        // Create new private conversation
        var conversation = new Conversation
        {
            Type = ConversationType.Private,
            Participants = new List<ConversationParticipant>
            {
                new ConversationParticipant { UserId = userId1, Role = ParticipantRole.Member },
                new ConversationParticipant { UserId = userId2, Role = ParticipantRole.Member }
            }
        };

        await _context.Conversations.AddAsync(conversation);
        await _context.SaveChangesAsync();

        return conversation;
    }

    public async Task<Conversation> CreateGroupConversationAsync(Guid creatorId, string name, string? description, IEnumerable<Guid> memberIds)
    {
        var allMemberIds = memberIds.Append(creatorId).Distinct().ToList();

        var conversation = new Conversation
        {
            Type = ConversationType.Group,
            Name = name,
            Description = description,
            CreatedById = creatorId,
            Participants = allMemberIds.Select(id => new ConversationParticipant
            {
                UserId = id,
                Role = id == creatorId ? ParticipantRole.Owner : ParticipantRole.Member
            }).ToList()
        };

        await _context.Conversations.AddAsync(conversation);
        await _context.SaveChangesAsync();

        return conversation;
    }

    public async Task<Conversation?> GetConversationByIdAsync(Guid conversationId, Guid userId)
    {
        return await _context.Conversations
            .Include(c => c.Participants)
                .ThenInclude(p => p.User)
                    .ThenInclude(u => u.NominalRoll)
            .Where(c => c.Id == conversationId)
            .Where(c => c.Participants.Any(p => p.UserId == userId && p.IsActive))
            .FirstOrDefaultAsync();
    }

    public async Task<IEnumerable<Conversation>> GetUserConversationsAsync(Guid userId)
    {
        return await _context.Conversations
            .Include(c => c.Participants)
                .ThenInclude(p => p.User)
                    .ThenInclude(u => u.NominalRoll)
            .Include(c => c.Messages.OrderByDescending(m => m.CreatedAt).Take(1))
            .Where(c => c.Participants.Any(p => p.UserId == userId && p.IsActive && !p.IsDeletedByUser))
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .ToListAsync();
    }

    public async Task<bool> AddParticipantAsync(Guid conversationId, Guid userId, Guid addedById)
    {
        var conversation = await _context.Conversations
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == conversationId);

        if (conversation == null || conversation.Type != ConversationType.Group)
            return false;

        var adder = conversation.Participants.FirstOrDefault(p => p.UserId == addedById && p.IsActive);
        if (adder == null || (adder.Role != ParticipantRole.Admin && adder.Role != ParticipantRole.Owner))
            return false;

        var existingParticipant = conversation.Participants.FirstOrDefault(p => p.UserId == userId);
        if (existingParticipant != null)
        {
            if (existingParticipant.IsActive)
                return true;

            existingParticipant.IsActive = true;
            existingParticipant.LeftAt = null;
            existingParticipant.JoinedAt = DateTime.UtcNow;
        }
        else
        {
            conversation.Participants.Add(new ConversationParticipant
            {
                UserId = userId,
                ConversationId = conversationId,
                Role = ParticipantRole.Member
            });
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveParticipantAsync(Guid conversationId, Guid userId, Guid removedById)
    {
        var conversation = await _context.Conversations
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == conversationId);

        if (conversation == null || conversation.Type != ConversationType.Group)
            return false;

        var remover = conversation.Participants.FirstOrDefault(p => p.UserId == removedById && p.IsActive);
        if (remover == null || (remover.Role != ParticipantRole.Admin && remover.Role != ParticipantRole.Owner))
            return false;

        var participant = conversation.Participants.FirstOrDefault(p => p.UserId == userId && p.IsActive);
        if (participant == null)
            return false;

        // Can't remove owner
        if (participant.Role == ParticipantRole.Owner)
            return false;

        participant.IsActive = false;
        participant.LeftAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> LeaveConversationAsync(Guid conversationId, Guid userId)
    {
        var participant = await _context.ConversationParticipants
            .Include(p => p.Conversation)
                .ThenInclude(c => c.Participants)
            .FirstOrDefaultAsync(p => p.ConversationId == conversationId && p.UserId == userId && p.IsActive);

        if (participant == null)
            return false;

        // If owner leaves, transfer ownership to oldest admin or member
        if (participant.Role == ParticipantRole.Owner)
        {
            var newOwner = participant.Conversation.Participants
                .Where(p => p.UserId != userId && p.IsActive)
                .OrderByDescending(p => p.Role)
                .ThenBy(p => p.JoinedAt)
                .FirstOrDefault();

            if (newOwner != null)
                newOwner.Role = ParticipantRole.Owner;
        }

        participant.IsActive = false;
        participant.LeftAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateConversationAsync(Guid conversationId, Guid userId, string? name, string? description, string? iconUrl)
    {
        var conversation = await _context.Conversations
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == conversationId);

        if (conversation == null || conversation.Type != ConversationType.Group)
            return false;

        var participant = conversation.Participants.FirstOrDefault(p => p.UserId == userId && p.IsActive);
        if (participant == null || (participant.Role != ParticipantRole.Admin && participant.Role != ParticipantRole.Owner))
            return false;

        if (name != null)
            conversation.Name = name;
        if (description != null)
            conversation.Description = description;
        if (iconUrl != null)
            conversation.IconUrl = iconUrl;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateParticipantRoleAsync(Guid conversationId, Guid targetUserId, Guid updatedById, ParticipantRole newRole)
    {
        var conversation = await _context.Conversations
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == conversationId);

        if (conversation == null || conversation.Type != ConversationType.Group)
            return false;

        var updater = conversation.Participants.FirstOrDefault(p => p.UserId == updatedById && p.IsActive);
        if (updater == null || updater.Role != ParticipantRole.Owner)
            return false;

        var target = conversation.Participants.FirstOrDefault(p => p.UserId == targetUserId && p.IsActive);
        if (target == null || target.UserId == updatedById)
            return false;

        // Can't make someone else owner
        if (newRole == ParticipantRole.Owner)
            return false;

        target.Role = newRole;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SetMessageExpiryAsync(Guid conversationId, Guid userId, MessageExpiry expiry)
    {
        var participant = await _context.ConversationParticipants
            .Include(p => p.Conversation)
            .FirstOrDefaultAsync(p => p.ConversationId == conversationId && p.UserId == userId && p.IsActive);

        if (participant == null)
            return false;

        participant.Conversation.DefaultMessageExpiry = expiry;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> MuteConversationAsync(Guid conversationId, Guid userId, DateTime? until)
    {
        var participant = await _context.ConversationParticipants
            .FirstOrDefaultAsync(p => p.ConversationId == conversationId && p.UserId == userId && p.IsActive);

        if (participant == null)
            return false;

        participant.IsMuted = until.HasValue;
        participant.MutedUntil = until;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ArchiveConversationAsync(Guid conversationId, Guid userId, bool archive)
    {
        var conversation = await _context.Conversations
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == conversationId);

        if (conversation == null)
            return false;

        var participant = conversation.Participants.FirstOrDefault(p => p.UserId == userId && p.IsActive);
        if (participant == null)
            return false;

        conversation.IsArchived = archive;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<ConversationParticipant>> GetParticipantsAsync(Guid conversationId)
    {
        return await _context.ConversationParticipants
            .Include(p => p.User)
                .ThenInclude(u => u.NominalRoll)
            .Where(p => p.ConversationId == conversationId && p.IsActive)
            .ToListAsync();
    }

    // Soft delete for user
    public async Task<bool> SoftDeleteConversationForUserAsync(Guid conversationId, Guid userId)
    {
        var participant = await _context.ConversationParticipants
            .FirstOrDefaultAsync(p => p.ConversationId == conversationId && p.UserId == userId && p.IsActive);

        if (participant == null)
            return false;

        participant.IsDeletedByUser = true;
        participant.DeletedByUserAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RestoreConversationForUserAsync(Guid conversationId, Guid userId)
    {
        var participant = await _context.ConversationParticipants
            .FirstOrDefaultAsync(p => p.ConversationId == conversationId && p.UserId == userId && p.IsActive);

        if (participant == null)
            return false;

        participant.IsDeletedByUser = false;
        participant.DeletedByUserAt = null;
        await _context.SaveChangesAsync();
        return true;
    }
}
