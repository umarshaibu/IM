using Microsoft.EntityFrameworkCore;
using IM.Core.Entities;

namespace IM.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<NominalRoll> NominalRolls => Set<NominalRoll>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserDevice> UserDevices => Set<UserDevice>();
    public DbSet<Contact> Contacts => Set<Contact>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<ConversationParticipant> ConversationParticipants => Set<ConversationParticipant>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<MessageStatusEntity> MessageStatuses => Set<MessageStatusEntity>();
    public DbSet<MediaFile> MediaFiles => Set<MediaFile>();
    public DbSet<Call> Calls => Set<Call>();
    public DbSet<CallParticipant> CallParticipants => Set<CallParticipant>();
    public DbSet<BlockedUser> BlockedUsers => Set<BlockedUser>();
    public DbSet<Status> Statuses => Set<Status>();
    public DbSet<StatusView> StatusViews => Set<StatusView>();
    public DbSet<LoginToken> LoginTokens => Set<LoginToken>();
    public DbSet<DeletedMessage> DeletedMessages => Set<DeletedMessage>();
    public DbSet<MessageForwardChain> MessageForwardChains => Set<MessageForwardChain>();
    public DbSet<MessageReaction> MessageReactions => Set<MessageReaction>();
    public DbSet<StarredMessage> StarredMessages => Set<StarredMessage>();
    public DbSet<PinnedMessage> PinnedMessages => Set<PinnedMessage>();
    public DbSet<Channel> Channels => Set<Channel>();
    public DbSet<ChannelFollower> ChannelFollowers => Set<ChannelFollower>();
    public DbSet<ChannelPost> ChannelPosts => Set<ChannelPost>();
    public DbSet<ChannelPostReaction> ChannelPostReactions => Set<ChannelPostReaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // NominalRoll
        modelBuilder.Entity<NominalRoll>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ServiceNumber).IsUnique();
            entity.Property(e => e.ServiceNumber).HasMaxLength(50).IsRequired();
            entity.Property(e => e.FullName).HasMaxLength(255).IsRequired();
            entity.Property(e => e.PhoneNumber).HasMaxLength(20);
            entity.Property(e => e.Department).HasMaxLength(100);
            entity.Property(e => e.RankPosition).HasMaxLength(100);
        });

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PhoneNumber).IsUnique();
            entity.HasIndex(e => e.NominalRollId).IsUnique();
            entity.Property(e => e.PhoneNumber).HasMaxLength(20).IsRequired();
            entity.Property(e => e.DisplayName).HasMaxLength(100);
            entity.Property(e => e.About).HasMaxLength(500);

            entity.HasOne(e => e.NominalRoll)
                .WithOne(e => e.User)
                .HasForeignKey<User>(e => e.NominalRollId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // UserDevice
        modelBuilder.Entity<UserDevice>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.DeviceToken);

            entity.HasOne(e => e.User)
                .WithMany(e => e.Devices)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Contact
        modelBuilder.Entity<Contact>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.UserId, e.ContactUserId }).IsUnique();

            entity.HasOne(e => e.User)
                .WithMany(e => e.Contacts)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ContactUser)
                .WithMany()
                .HasForeignKey(e => e.ContactUserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Conversation
        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);

            entity.HasOne(e => e.CreatedBy)
                .WithMany()
                .HasForeignKey(e => e.CreatedById)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.DeletedBy)
                .WithMany()
                .HasForeignKey(e => e.DeletedById)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ConversationParticipant
        modelBuilder.Entity<ConversationParticipant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ConversationId, e.UserId }).IsUnique();

            entity.HasOne(e => e.Conversation)
                .WithMany(e => e.Participants)
                .HasForeignKey(e => e.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany(e => e.ConversationParticipants)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Message
        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ConversationId);
            entity.HasIndex(e => e.SenderId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.ExpiresAt);

            entity.HasOne(e => e.Conversation)
                .WithMany(e => e.Messages)
                .HasForeignKey(e => e.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Sender)
                .WithMany(e => e.SentMessages)
                .HasForeignKey(e => e.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ReplyToMessage)
                .WithMany()
                .HasForeignKey(e => e.ReplyToMessageId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.ForwardedFromMessage)
                .WithMany()
                .HasForeignKey(e => e.ForwardedFromMessageId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.OriginalMessage)
                .WithMany()
                .HasForeignKey(e => e.OriginalMessageId)
                .OnDelete(DeleteBehavior.SetNull);

            // Service Number fields
            entity.Property(e => e.SenderServiceNumber).HasMaxLength(50);
            entity.Property(e => e.OriginalSenderServiceNumber).HasMaxLength(50);
            entity.Property(e => e.MediaOriginatorServiceNumber).HasMaxLength(50);
        });

        // MessageStatusEntity
        modelBuilder.Entity<MessageStatusEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.MessageId, e.UserId }).IsUnique();

            entity.HasOne(e => e.Message)
                .WithMany(e => e.Statuses)
                .HasForeignKey(e => e.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // MediaFile
        modelBuilder.Entity<MediaFile>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.Message)
                .WithMany(e => e.MediaFiles)
                .HasForeignKey(e => e.MessageId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.UploadedBy)
                .WithMany()
                .HasForeignKey(e => e.UploadedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Call
        modelBuilder.Entity<Call>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.RoomId);

            entity.HasOne(e => e.Conversation)
                .WithMany()
                .HasForeignKey(e => e.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Initiator)
                .WithMany()
                .HasForeignKey(e => e.InitiatorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // CallParticipant
        modelBuilder.Entity<CallParticipant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.CallId, e.UserId }).IsUnique();

            entity.HasOne(e => e.Call)
                .WithMany(e => e.Participants)
                .HasForeignKey(e => e.CallId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // BlockedUser
        modelBuilder.Entity<BlockedUser>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.UserId, e.BlockedUserId }).IsUnique();

            entity.HasOne(e => e.User)
                .WithMany(e => e.BlockedUsers)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Blocked)
                .WithMany(e => e.BlockedByUsers)
                .HasForeignKey(e => e.BlockedUserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Status
        modelBuilder.Entity<Status>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ExpiresAt);

            entity.HasOne(e => e.User)
                .WithMany(e => e.Statuses)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // StatusView
        modelBuilder.Entity<StatusView>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.StatusId, e.ViewerId }).IsUnique();

            entity.HasOne(e => e.Status)
                .WithMany(e => e.Views)
                .HasForeignKey(e => e.StatusId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Viewer)
                .WithMany()
                .HasForeignKey(e => e.ViewerId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // LoginToken
        modelBuilder.Entity<LoginToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.NominalRollId);
            entity.HasIndex(e => e.Token);
            entity.Property(e => e.Token).HasMaxLength(10).IsRequired();

            entity.HasOne(e => e.NominalRoll)
                .WithMany()
                .HasForeignKey(e => e.NominalRollId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // DeletedMessage (Audit table for soft-deleted messages)
        modelBuilder.Entity<DeletedMessage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OriginalMessageId);
            entity.HasIndex(e => e.ConversationId);
            entity.HasIndex(e => e.DeletedById);
            entity.HasIndex(e => e.DeletedAt);
            entity.Property(e => e.SenderServiceNumber).HasMaxLength(50).IsRequired();
            entity.Property(e => e.DeletedByServiceNumber).HasMaxLength(50).IsRequired();
            entity.Property(e => e.OriginalSenderServiceNumber).HasMaxLength(50);
            entity.Property(e => e.MediaOriginatorServiceNumber).HasMaxLength(50);

            entity.HasOne(e => e.Conversation)
                .WithMany()
                .HasForeignKey(e => e.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Sender)
                .WithMany()
                .HasForeignKey(e => e.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.DeletedBy)
                .WithMany()
                .HasForeignKey(e => e.DeletedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // MessageForwardChain (Track forward history)
        modelBuilder.Entity<MessageForwardChain>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.MessageId);
            entity.HasIndex(e => e.OriginalMessageId);
            entity.HasIndex(e => e.ForwarderId);
            entity.Property(e => e.ForwarderServiceNumber).HasMaxLength(50).IsRequired();

            entity.HasOne(e => e.Message)
                .WithMany(m => m.ForwardChain)
                .HasForeignKey(e => e.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.OriginalMessage)
                .WithMany()
                .HasForeignKey(e => e.OriginalMessageId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Forwarder)
                .WithMany()
                .HasForeignKey(e => e.ForwarderId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.FromConversation)
                .WithMany()
                .HasForeignKey(e => e.FromConversationId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ToConversation)
                .WithMany()
                .HasForeignKey(e => e.ToConversationId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // MessageReaction
        modelBuilder.Entity<MessageReaction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.MessageId, e.UserId, e.Emoji }).IsUnique();
            entity.Property(e => e.Emoji).HasMaxLength(20).IsRequired();

            entity.HasOne(e => e.Message)
                .WithMany(m => m.Reactions)
                .HasForeignKey(e => e.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // StarredMessage
        modelBuilder.Entity<StarredMessage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.UserId, e.MessageId }).IsUnique();
            entity.HasIndex(e => e.UserId);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Message)
                .WithMany()
                .HasForeignKey(e => e.MessageId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // PinnedMessage
        modelBuilder.Entity<PinnedMessage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ConversationId, e.MessageId }).IsUnique();
            entity.HasIndex(e => e.ConversationId);

            entity.HasOne(e => e.Conversation)
                .WithMany()
                .HasForeignKey(e => e.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Message)
                .WithMany()
                .HasForeignKey(e => e.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.PinnedBy)
                .WithMany()
                .HasForeignKey(e => e.PinnedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Channel
        modelBuilder.Entity<Channel>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Name);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);

            entity.HasOne(e => e.Owner)
                .WithMany(e => e.OwnedChannels)
                .HasForeignKey(e => e.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ChannelFollower
        modelBuilder.Entity<ChannelFollower>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ChannelId, e.UserId }).IsUnique();

            entity.HasOne(e => e.Channel)
                .WithMany(e => e.Followers)
                .HasForeignKey(e => e.ChannelId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany(e => e.FollowedChannels)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ChannelPost
        modelBuilder.Entity<ChannelPost>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ChannelId);
            entity.HasIndex(e => e.CreatedAt);

            entity.HasOne(e => e.Channel)
                .WithMany(e => e.Posts)
                .HasForeignKey(e => e.ChannelId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Author)
                .WithMany()
                .HasForeignKey(e => e.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ChannelPostReaction
        modelBuilder.Entity<ChannelPostReaction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.PostId, e.UserId, e.Emoji }).IsUnique();
            entity.Property(e => e.Emoji).HasMaxLength(20).IsRequired();

            entity.HasOne(e => e.Post)
                .WithMany(e => e.Reactions)
                .HasForeignKey(e => e.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var entries = ChangeTracker.Entries<BaseEntity>();

        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
