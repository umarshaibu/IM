using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using IM.Core.Entities;
using IM.Core.Enums;

namespace IM.Infrastructure.Data;

public class DatabaseSeeder
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DatabaseSeeder> _logger;

    public DatabaseSeeder(ApplicationDbContext context, ILogger<DatabaseSeeder> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        try
        {
            // Apply pending migrations
            await _context.Database.MigrateAsync();

            // Seed data
            await SeedNominalRollsAsync();
            await SeedUsersAsync();
            await SeedContactsAsync();
            await SeedConversationsAsync();
            await SeedMessagesAsync();
            await SeedStatusesAsync();

            _logger.LogInformation("Database seeding completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding database");
            throw;
        }
    }

    private async Task SeedNominalRollsAsync()
    {
        if (await _context.NominalRolls.AnyAsync())
            return;

        var nominalRolls = new List<NominalRoll>
        {
            new NominalRoll
            {
                Id = Guid.Parse("a1111111-1111-1111-1111-111111111111"),
                ServiceNumber = "AP/12345",
                FullName = "John Adebayo",
                PhoneNumber = "+2348012345678",
                Department = "Operations",
                RankPosition = "Inspector",
                Status = UserStatus.Active
            },
            new NominalRoll
            {
                Id = Guid.Parse("a2222222-2222-2222-2222-222222222222"),
                ServiceNumber = "AP/12346",
                FullName = "Mary Okonkwo",
                PhoneNumber = "+2348023456789",
                Department = "Administration",
                RankPosition = "Chief Inspector",
                Status = UserStatus.Active
            },
            new NominalRoll
            {
                Id = Guid.Parse("a3333333-3333-3333-3333-333333333333"),
                ServiceNumber = "AP/12347",
                FullName = "Peter Emeka",
                PhoneNumber = "+2348034567890",
                Department = "Logistics",
                RankPosition = "Superintendent",
                Status = UserStatus.Active
            },
            new NominalRoll
            {
                Id = Guid.Parse("a4444444-4444-4444-4444-444444444444"),
                ServiceNumber = "AP/12348",
                FullName = "Sarah Ibrahim",
                PhoneNumber = "+2348045678901",
                Department = "Communications",
                RankPosition = "Deputy Superintendent",
                Status = UserStatus.Active
            },
            new NominalRoll
            {
                Id = Guid.Parse("a5555555-5555-5555-5555-555555555555"),
                ServiceNumber = "AP/12349",
                FullName = "David Chukwu",
                PhoneNumber = "+2348056789012",
                Department = "Training",
                RankPosition = "Inspector",
                Status = UserStatus.Active
            },
            new NominalRoll
            {
                Id = Guid.Parse("a6666666-6666-6666-6666-666666666666"),
                ServiceNumber = "AP/12350",
                FullName = "Amina Yusuf",
                PhoneNumber = "+2348067890123",
                Department = "Operations",
                RankPosition = "Sergeant",
                Status = UserStatus.Active
            },
            new NominalRoll
            {
                Id = Guid.Parse("a7777777-7777-7777-7777-777777777777"),
                ServiceNumber = "AP/12351",
                FullName = "Michael Obi",
                PhoneNumber = "+2348078901234",
                Department = "Intelligence",
                RankPosition = "Chief Superintendent",
                Status = UserStatus.Active
            },
            new NominalRoll
            {
                Id = Guid.Parse("a8888888-8888-8888-8888-888888888888"),
                ServiceNumber = "AP/12352",
                FullName = "Grace Adekunle",
                PhoneNumber = "+2348089012345",
                Department = "Administration",
                RankPosition = "Inspector",
                Status = UserStatus.Active
            },
            new NominalRoll
            {
                Id = Guid.Parse("a9999999-9999-9999-9999-999999999999"),
                ServiceNumber = "AP/12353",
                FullName = "Emmanuel Bello",
                PhoneNumber = "+2348090123456",
                Department = "Logistics",
                RankPosition = "Corporal",
                Status = UserStatus.Active
            },
            new NominalRoll
            {
                Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                ServiceNumber = "AP/12354",
                FullName = "Fatima Abubakar",
                PhoneNumber = "+2348001234567",
                Department = "Communications",
                RankPosition = "Sergeant",
                Status = UserStatus.Active
            }
        };

        await _context.NominalRolls.AddRangeAsync(nominalRolls);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Seeded {Count} nominal rolls", nominalRolls.Count);
    }

    private async Task SeedUsersAsync()
    {
        if (await _context.Users.AnyAsync())
            return;

        var users = new List<User>
        {
            new User
            {
                Id = Guid.Parse("b1111111-1111-1111-1111-111111111111"),
                NominalRollId = Guid.Parse("a1111111-1111-1111-1111-111111111111"),
                PhoneNumber = "+2348012345678",
                DisplayName = "John Adebayo",
                About = "Operations Officer",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
                ShowLastSeen = true,
                ShowProfilePhoto = true,
                ShowAbout = true,
                ReadReceipts = true
            },
            new User
            {
                Id = Guid.Parse("b2222222-2222-2222-2222-222222222222"),
                NominalRollId = Guid.Parse("a2222222-2222-2222-2222-222222222222"),
                PhoneNumber = "+2348023456789",
                DisplayName = "Mary Okonkwo",
                About = "Administration Lead",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
                ShowLastSeen = true,
                ShowProfilePhoto = true,
                ShowAbout = true,
                ReadReceipts = true
            },
            new User
            {
                Id = Guid.Parse("b3333333-3333-3333-3333-333333333333"),
                NominalRollId = Guid.Parse("a3333333-3333-3333-3333-333333333333"),
                PhoneNumber = "+2348034567890",
                DisplayName = "Peter Emeka",
                About = "Logistics Coordinator",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
                ShowLastSeen = true,
                ShowProfilePhoto = true,
                ShowAbout = true,
                ReadReceipts = true
            },
            new User
            {
                Id = Guid.Parse("b4444444-4444-4444-4444-444444444444"),
                NominalRollId = Guid.Parse("a4444444-4444-4444-4444-444444444444"),
                PhoneNumber = "+2348045678901",
                DisplayName = "Sarah Ibrahim",
                About = "Communications Expert",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
                ShowLastSeen = true,
                ShowProfilePhoto = true,
                ShowAbout = true,
                ReadReceipts = true
            },
            new User
            {
                Id = Guid.Parse("b5555555-5555-5555-5555-555555555555"),
                NominalRollId = Guid.Parse("a5555555-5555-5555-5555-555555555555"),
                PhoneNumber = "+2348056789012",
                DisplayName = "David Chukwu",
                About = "Training Instructor",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
                ShowLastSeen = true,
                ShowProfilePhoto = true,
                ShowAbout = true,
                ReadReceipts = true
            }
        };

        await _context.Users.AddRangeAsync(users);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Seeded {Count} users", users.Count);
    }

    private async Task SeedContactsAsync()
    {
        if (await _context.Contacts.AnyAsync())
            return;

        // Create contacts between users
        var users = await _context.Users.ToListAsync();
        var contacts = new List<Contact>();

        foreach (var user in users)
        {
            foreach (var otherUser in users.Where(u => u.Id != user.Id))
            {
                contacts.Add(new Contact
                {
                    UserId = user.Id,
                    ContactUserId = otherUser.Id,
                    IsFavorite = false
                });
            }
        }

        await _context.Contacts.AddRangeAsync(contacts);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Seeded {Count} contacts", contacts.Count);
    }

    private async Task SeedConversationsAsync()
    {
        if (await _context.Conversations.AnyAsync())
            return;

        var users = await _context.Users.ToListAsync();
        if (users.Count < 2)
            return;

        // Create some private conversations
        var privateConversations = new List<Conversation>
        {
            new Conversation
            {
                Id = Guid.Parse("c1111111-1111-1111-1111-111111111111"),
                Type = ConversationType.Private,
                CreatedById = users[0].Id,
                LastMessageAt = DateTime.UtcNow.AddHours(-1)
            },
            new Conversation
            {
                Id = Guid.Parse("c2222222-2222-2222-2222-222222222222"),
                Type = ConversationType.Private,
                CreatedById = users[0].Id,
                LastMessageAt = DateTime.UtcNow.AddHours(-2)
            }
        };

        // Create a group conversation
        var groupConversation = new Conversation
        {
            Id = Guid.Parse("c3333333-3333-3333-3333-333333333333"),
            Type = ConversationType.Group,
            Name = "Operations Team",
            Description = "Main operations team discussion group",
            CreatedById = users[0].Id,
            LastMessageAt = DateTime.UtcNow.AddMinutes(-30)
        };

        await _context.Conversations.AddRangeAsync(privateConversations);
        await _context.Conversations.AddAsync(groupConversation);
        await _context.SaveChangesAsync();

        // Add participants
        var participants = new List<ConversationParticipant>
        {
            // Private conversation 1: User 1 and User 2
            new ConversationParticipant { ConversationId = privateConversations[0].Id, UserId = users[0].Id, Role = ParticipantRole.Member, IsActive = true, JoinedAt = DateTime.UtcNow },
            new ConversationParticipant { ConversationId = privateConversations[0].Id, UserId = users[1].Id, Role = ParticipantRole.Member, IsActive = true, JoinedAt = DateTime.UtcNow },

            // Private conversation 2: User 1 and User 3
            new ConversationParticipant { ConversationId = privateConversations[1].Id, UserId = users[0].Id, Role = ParticipantRole.Member, IsActive = true, JoinedAt = DateTime.UtcNow },
            new ConversationParticipant { ConversationId = privateConversations[1].Id, UserId = users[2].Id, Role = ParticipantRole.Member, IsActive = true, JoinedAt = DateTime.UtcNow },

            // Group conversation: User 1 (admin), User 2, User 3, User 4
            new ConversationParticipant { ConversationId = groupConversation.Id, UserId = users[0].Id, Role = ParticipantRole.Admin, IsActive = true, JoinedAt = DateTime.UtcNow },
            new ConversationParticipant { ConversationId = groupConversation.Id, UserId = users[1].Id, Role = ParticipantRole.Member, IsActive = true, JoinedAt = DateTime.UtcNow },
            new ConversationParticipant { ConversationId = groupConversation.Id, UserId = users[2].Id, Role = ParticipantRole.Member, IsActive = true, JoinedAt = DateTime.UtcNow },
            new ConversationParticipant { ConversationId = groupConversation.Id, UserId = users[3].Id, Role = ParticipantRole.Member, IsActive = true, JoinedAt = DateTime.UtcNow }
        };

        await _context.ConversationParticipants.AddRangeAsync(participants);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Seeded {Count} conversations with participants", privateConversations.Count + 1);
    }

    private async Task SeedMessagesAsync()
    {
        if (await _context.Messages.AnyAsync())
            return;

        var conversations = await _context.Conversations.ToListAsync();
        var users = await _context.Users.ToListAsync();

        if (!conversations.Any() || users.Count < 2)
            return;

        var messages = new List<Message>();
        var now = DateTime.UtcNow;

        // Messages for first private conversation
        messages.AddRange(new[]
        {
            new Message
            {
                ConversationId = conversations[0].Id,
                SenderId = users[0].Id,
                Content = "Hello Mary, how are you?",
                Type = MessageType.Text,
                CreatedAt = now.AddHours(-1)
            },
            new Message
            {
                ConversationId = conversations[0].Id,
                SenderId = users[1].Id,
                Content = "Hi John! I'm doing well, thanks for asking.",
                Type = MessageType.Text,
                CreatedAt = now.AddHours(-1).AddMinutes(5)
            },
            new Message
            {
                ConversationId = conversations[0].Id,
                SenderId = users[0].Id,
                Content = "Great! Did you get my report from yesterday?",
                Type = MessageType.Text,
                CreatedAt = now.AddHours(-1).AddMinutes(10)
            },
            new Message
            {
                ConversationId = conversations[0].Id,
                SenderId = users[1].Id,
                Content = "Yes, I reviewed it. Looks good!",
                Type = MessageType.Text,
                CreatedAt = now.AddHours(-1).AddMinutes(15)
            }
        });

        // Messages for second private conversation
        messages.AddRange(new[]
        {
            new Message
            {
                ConversationId = conversations[1].Id,
                SenderId = users[2].Id,
                Content = "John, we need to discuss the logistics for next week.",
                Type = MessageType.Text,
                CreatedAt = now.AddHours(-2)
            },
            new Message
            {
                ConversationId = conversations[1].Id,
                SenderId = users[0].Id,
                Content = "Sure Peter, what time works for you?",
                Type = MessageType.Text,
                CreatedAt = now.AddHours(-2).AddMinutes(10)
            }
        });

        // Messages for group conversation
        if (conversations.Count > 2)
        {
            messages.AddRange(new[]
            {
                new Message
                {
                    ConversationId = conversations[2].Id,
                    SenderId = users[0].Id,
                    Content = "Good morning team! Here's the agenda for today's meeting.",
                    Type = MessageType.Text,
                    CreatedAt = now.AddMinutes(-60)
                },
                new Message
                {
                    ConversationId = conversations[2].Id,
                    SenderId = users[1].Id,
                    Content = "Thanks for sharing, John.",
                    Type = MessageType.Text,
                    CreatedAt = now.AddMinutes(-55)
                },
                new Message
                {
                    ConversationId = conversations[2].Id,
                    SenderId = users[2].Id,
                    Content = "I'll be joining in 10 minutes.",
                    Type = MessageType.Text,
                    CreatedAt = now.AddMinutes(-50)
                },
                new Message
                {
                    ConversationId = conversations[2].Id,
                    SenderId = users[3].Id,
                    Content = "Same here. See you all soon!",
                    Type = MessageType.Text,
                    CreatedAt = now.AddMinutes(-45)
                },
                new Message
                {
                    ConversationId = conversations[2].Id,
                    SenderId = users[0].Id,
                    Content = "Alright, let's start the meeting.",
                    Type = MessageType.Text,
                    CreatedAt = now.AddMinutes(-30)
                }
            });
        }

        await _context.Messages.AddRangeAsync(messages);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Seeded {Count} messages", messages.Count);
    }

    private async Task SeedStatusesAsync()
    {
        if (await _context.Statuses.AnyAsync())
            return;

        var users = await _context.Users.ToListAsync();
        if (!users.Any())
            return;

        var statuses = new List<Status>
        {
            new Status
            {
                UserId = users[0].Id,
                TextContent = "Working on the new project today!",
                BackgroundColor = "#075E54",
                ExpiresAt = DateTime.UtcNow.AddHours(24)
            },
            new Status
            {
                UserId = users[1].Id,
                TextContent = "Happy Friday everyone!",
                BackgroundColor = "#128C7E",
                ExpiresAt = DateTime.UtcNow.AddHours(24)
            }
        };

        await _context.Statuses.AddRangeAsync(statuses);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Seeded {Count} statuses", statuses.Count);
    }
}
