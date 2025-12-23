using IM.Core.Entities;

namespace IM.Core.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IRepository<NominalRoll> NominalRolls { get; }
    IRepository<User> Users { get; }
    IRepository<UserDevice> UserDevices { get; }
    IRepository<Contact> Contacts { get; }
    IRepository<Conversation> Conversations { get; }
    IRepository<ConversationParticipant> ConversationParticipants { get; }
    IRepository<Message> Messages { get; }
    IRepository<MessageStatusEntity> MessageStatuses { get; }
    IRepository<MediaFile> MediaFiles { get; }
    IRepository<Call> Calls { get; }
    IRepository<CallParticipant> CallParticipants { get; }
    IRepository<BlockedUser> BlockedUsers { get; }
    IRepository<Status> Statuses { get; }
    IRepository<StatusView> StatusViews { get; }

    Task<int> SaveChangesAsync();
    Task BeginTransactionAsync();
    Task CommitTransactionAsync();
    Task RollbackTransactionAsync();
}
