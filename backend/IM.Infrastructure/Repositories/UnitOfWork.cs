using Microsoft.EntityFrameworkCore.Storage;
using IM.Core.Entities;
using IM.Core.Interfaces;
using IM.Infrastructure.Data;

namespace IM.Infrastructure.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;
    private IDbContextTransaction? _transaction;

    private IRepository<NominalRoll>? _nominalRolls;
    private IRepository<User>? _users;
    private IRepository<UserDevice>? _userDevices;
    private IRepository<Contact>? _contacts;
    private IRepository<Conversation>? _conversations;
    private IRepository<ConversationParticipant>? _conversationParticipants;
    private IRepository<Message>? _messages;
    private IRepository<MessageStatusEntity>? _messageStatuses;
    private IRepository<MediaFile>? _mediaFiles;
    private IRepository<Call>? _calls;
    private IRepository<CallParticipant>? _callParticipants;
    private IRepository<BlockedUser>? _blockedUsers;
    private IRepository<Status>? _statuses;
    private IRepository<StatusView>? _statusViews;

    public UnitOfWork(ApplicationDbContext context)
    {
        _context = context;
    }

    public IRepository<NominalRoll> NominalRolls =>
        _nominalRolls ??= new Repository<NominalRoll>(_context);

    public IRepository<User> Users =>
        _users ??= new Repository<User>(_context);

    public IRepository<UserDevice> UserDevices =>
        _userDevices ??= new Repository<UserDevice>(_context);

    public IRepository<Contact> Contacts =>
        _contacts ??= new Repository<Contact>(_context);

    public IRepository<Conversation> Conversations =>
        _conversations ??= new Repository<Conversation>(_context);

    public IRepository<ConversationParticipant> ConversationParticipants =>
        _conversationParticipants ??= new Repository<ConversationParticipant>(_context);

    public IRepository<Message> Messages =>
        _messages ??= new Repository<Message>(_context);

    public IRepository<MessageStatusEntity> MessageStatuses =>
        _messageStatuses ??= new Repository<MessageStatusEntity>(_context);

    public IRepository<MediaFile> MediaFiles =>
        _mediaFiles ??= new Repository<MediaFile>(_context);

    public IRepository<Call> Calls =>
        _calls ??= new Repository<Call>(_context);

    public IRepository<CallParticipant> CallParticipants =>
        _callParticipants ??= new Repository<CallParticipant>(_context);

    public IRepository<BlockedUser> BlockedUsers =>
        _blockedUsers ??= new Repository<BlockedUser>(_context);

    public IRepository<Status> Statuses =>
        _statuses ??= new Repository<Status>(_context);

    public IRepository<StatusView> StatusViews =>
        _statusViews ??= new Repository<StatusView>(_context);

    public async Task<int> SaveChangesAsync()
    {
        return await _context.SaveChangesAsync();
    }

    public async Task BeginTransactionAsync()
    {
        _transaction = await _context.Database.BeginTransactionAsync();
    }

    public async Task CommitTransactionAsync()
    {
        if (_transaction != null)
        {
            await _transaction.CommitAsync();
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public async Task RollbackTransactionAsync()
    {
        if (_transaction != null)
        {
            await _transaction.RollbackAsync();
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public void Dispose()
    {
        _transaction?.Dispose();
        _context.Dispose();
    }
}
