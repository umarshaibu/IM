using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IM.API.DTOs;
using IM.Core.Entities;
using IM.Core.Enums;
using IM.Core.Interfaces;
using IM.Infrastructure.Data;

namespace IM.API.Controllers;

[Route("admin")]
public class AdminWebController : Controller
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IConfiguration _configuration;

    public AdminWebController(
        ApplicationDbContext context,
        INotificationService notificationService,
        IConfiguration configuration)
    {
        _context = context;
        _notificationService = notificationService;
        _configuration = configuration;
    }

    // GET: /admin/login
    [HttpGet("login")]
    [AllowAnonymous]
    public IActionResult Login(string? returnUrl = null)
    {
        if (User.Identity?.IsAuthenticated == true)
        {
            return RedirectToAction(nameof(Index));
        }
        ViewData["ReturnUrl"] = returnUrl;
        return View();
    }

    // POST: /admin/login
    [HttpPost("login")]
    [AllowAnonymous]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Login(AdminLoginViewModel model, string? returnUrl = null)
    {
        ViewData["ReturnUrl"] = returnUrl;

        if (!ModelState.IsValid)
        {
            return View(model);
        }

        // Get admin credentials from configuration
        var adminUsername = _configuration["AdminCredentials:Username"] ?? "admin";
        var adminPassword = _configuration["AdminCredentials:Password"] ?? "Admin@123";

        if (model.Username == adminUsername && model.Password == adminPassword)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, model.Username),
                new Claim(ClaimTypes.Role, "Admin")
            };

            var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            var authProperties = new AuthenticationProperties
            {
                IsPersistent = model.RememberMe,
                ExpiresUtc = DateTimeOffset.UtcNow.AddHours(12)
            };

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(claimsIdentity),
                authProperties);

            return LocalRedirect(returnUrl ?? "/admin");
        }

        ModelState.AddModelError(string.Empty, "Invalid username or password");
        return View(model);
    }

    // GET: /admin/logout
    [HttpGet("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return RedirectToAction(nameof(Login));
    }

    // GET: /admin
    [HttpGet("")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    public async Task<IActionResult> Index()
    {
        ViewData["Title"] = "Dashboard";
        ViewData["ActivePage"] = "Dashboard";

        var today = DateTime.UtcNow.Date;
        var lastWeek = today.AddDays(-6); // Start from 6 days ago to include today (7 days total)

        // Get message counts from database
        var messageCounts = await _context.Messages
            .Where(m => m.CreatedAt >= lastWeek)
            .ToListAsync();

        // Group by date in memory to avoid PostgreSQL compatibility issues
        var messagesByDate = messageCounts
            .GroupBy(m => m.CreatedAt.Date)
            .ToDictionary(g => g.Key, g => g.Count());

        // Create a list with all 7 days, filling in zeros for days with no messages
        var messageStats = new List<DailyStatDto>();
        for (int i = 6; i >= 0; i--)
        {
            var date = today.AddDays(-i);
            messageStats.Add(new DailyStatDto
            {
                Date = date,
                Count = messagesByDate.GetValueOrDefault(date, 0)
            });
        }

        var analytics = new DashboardViewModel
        {
            TotalUsers = await _context.Users.CountAsync(),
            OnlineUsers = await _context.Users.CountAsync(u => u.IsOnline),
            TotalConversations = await _context.Conversations.CountAsync(),
            TotalMessages = await _context.Messages.CountAsync(),
            TodayMessages = await _context.Messages.CountAsync(m => m.CreatedAt >= today),
            TotalCalls = await _context.Calls.CountAsync(),
            TodayCalls = await _context.Calls.CountAsync(c => c.StartedAt >= today),
            NominalRollCount = await _context.NominalRolls.CountAsync(),
            RegisteredCount = await _context.NominalRolls.CountAsync(n => n.User != null),
            TotalChannels = await _context.Channels.CountAsync(),
            RecentUsers = await _context.Users
                .Include(u => u.NominalRoll)
                .OrderByDescending(u => u.CreatedAt)
                .Take(5)
                .ToListAsync(),
            MessageStats = messageStats
        };

        return View(analytics);
    }

    // GET: /admin/users
    [HttpGet("users")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    public async Task<IActionResult> Users(string? search, int page = 1, int pageSize = 20)
    {
        ViewData["Title"] = "Users";
        ViewData["ActivePage"] = "Users";

        var query = _context.Users
            .Include(u => u.NominalRoll)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(u =>
                u.NominalRoll.ServiceNumber.Contains(search) ||
                u.NominalRoll.FullName.Contains(search) ||
                u.PhoneNumber.Contains(search) ||
                (u.DisplayName != null && u.DisplayName.Contains(search)));
        }

        var totalCount = await query.CountAsync();
        var users = await query
            .OrderBy(u => u.NominalRoll.ServiceNumber)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var viewModel = new UsersListViewModel
        {
            Users = users,
            CurrentPage = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            Search = search
        };

        return View(viewModel);
    }

    // GET: /admin/users/{id}
    [HttpGet("users/{id}")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    public async Task<IActionResult> UserDetails(Guid id)
    {
        var user = await _context.Users
            .Include(u => u.NominalRoll)
            .Include(u => u.Devices)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
        {
            return NotFound();
        }

        ViewData["Title"] = $"User - {user.NominalRoll.FullName}";
        ViewData["ActivePage"] = "Users";

        return View(user);
    }

    // POST: /admin/users/{id}/status
    [HttpPost("users/{id}/status")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateUserStatus(Guid id, UserStatus status)
    {
        var user = await _context.Users
            .Include(u => u.NominalRoll)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
        {
            return NotFound();
        }

        user.NominalRoll.Status = status;
        await _context.SaveChangesAsync();

        TempData["Success"] = $"User status updated to {status}";
        return RedirectToAction(nameof(UserDetails), new { id });
    }

    // GET: /admin/nominal-roll
    [HttpGet("nominal-roll")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    public async Task<IActionResult> NominalRoll(string? search, int page = 1, int pageSize = 20)
    {
        ViewData["Title"] = "Nominal Roll";
        ViewData["ActivePage"] = "NominalRoll";

        var query = _context.NominalRolls
            .Include(n => n.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(n =>
                n.ServiceNumber.Contains(search) ||
                n.FullName.Contains(search) ||
                (n.Department != null && n.Department.Contains(search)));
        }

        var totalCount = await query.CountAsync();
        var entries = await query
            .OrderBy(n => n.ServiceNumber)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var viewModel = new NominalRollListViewModel
        {
            Entries = entries,
            CurrentPage = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            Search = search
        };

        return View(viewModel);
    }

    // GET: /admin/nominal-roll/create
    [HttpGet("nominal-roll/create")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    public IActionResult CreateNominalRoll()
    {
        ViewData["Title"] = "Add Nominal Roll Entry";
        ViewData["ActivePage"] = "NominalRoll";
        return View();
    }

    // POST: /admin/nominal-roll/create
    [HttpPost("nominal-roll/create")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CreateNominalRoll(CreateNominalRollViewModel model)
    {
        ViewData["Title"] = "Add Nominal Roll Entry";
        ViewData["ActivePage"] = "NominalRoll";

        if (!ModelState.IsValid)
        {
            return View(model);
        }

        var exists = await _context.NominalRolls.AnyAsync(n => n.ServiceNumber == model.ServiceNumber);
        if (exists)
        {
            ModelState.AddModelError("ServiceNumber", "Service number already exists");
            return View(model);
        }

        var entry = new NominalRoll
        {
            ServiceNumber = model.ServiceNumber,
            FullName = model.FullName,
            PhoneNumber = model.PhoneNumber,
            Email = model.Email,
            Department = model.Department,
            RankPosition = model.RankPosition,
            Status = UserStatus.Active
        };

        await _context.NominalRolls.AddAsync(entry);
        await _context.SaveChangesAsync();

        TempData["Success"] = "Nominal roll entry created successfully";
        return RedirectToAction(nameof(NominalRoll));
    }

    // GET: /admin/nominal-roll/{id}/edit
    [HttpGet("nominal-roll/{id}/edit")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    public async Task<IActionResult> EditNominalRoll(Guid id)
    {
        var entry = await _context.NominalRolls.FindAsync(id);
        if (entry == null)
        {
            return NotFound();
        }

        ViewData["Title"] = "Edit Nominal Roll Entry";
        ViewData["ActivePage"] = "NominalRoll";

        var viewModel = new EditNominalRollViewModel
        {
            Id = entry.Id,
            ServiceNumber = entry.ServiceNumber,
            FullName = entry.FullName,
            PhoneNumber = entry.PhoneNumber,
            Email = entry.Email,
            Department = entry.Department,
            RankPosition = entry.RankPosition,
            Status = entry.Status
        };

        return View(viewModel);
    }

    // POST: /admin/nominal-roll/{id}/edit
    [HttpPost("nominal-roll/{id}/edit")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> EditNominalRoll(Guid id, EditNominalRollViewModel model)
    {
        ViewData["Title"] = "Edit Nominal Roll Entry";
        ViewData["ActivePage"] = "NominalRoll";

        if (!ModelState.IsValid)
        {
            return View(model);
        }

        var entry = await _context.NominalRolls.FindAsync(id);
        if (entry == null)
        {
            return NotFound();
        }

        entry.FullName = model.FullName;
        entry.PhoneNumber = model.PhoneNumber;
        entry.Email = model.Email;
        entry.Department = model.Department;
        entry.RankPosition = model.RankPosition;
        entry.Status = model.Status;

        await _context.SaveChangesAsync();

        TempData["Success"] = "Nominal roll entry updated successfully";
        return RedirectToAction(nameof(NominalRoll));
    }

    // POST: /admin/nominal-roll/{id}/delete
    [HttpPost("nominal-roll/{id}/delete")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteNominalRoll(Guid id)
    {
        var entry = await _context.NominalRolls
            .Include(n => n.User)
            .FirstOrDefaultAsync(n => n.Id == id);

        if (entry == null)
        {
            return NotFound();
        }

        if (entry.User != null)
        {
            TempData["Error"] = "Cannot delete nominal roll entry with registered user";
            return RedirectToAction(nameof(NominalRoll));
        }

        _context.NominalRolls.Remove(entry);
        await _context.SaveChangesAsync();

        TempData["Success"] = "Nominal roll entry deleted successfully";
        return RedirectToAction(nameof(NominalRoll));
    }

    // GET: /admin/channels
    [HttpGet("channels")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    public async Task<IActionResult> Channels(string? search, int page = 1, int pageSize = 20)
    {
        ViewData["Title"] = "Channels";
        ViewData["ActivePage"] = "Channels";

        var query = _context.Channels
            .Include(c => c.Owner)
                .ThenInclude(o => o.NominalRoll)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(c =>
                c.Name.Contains(search) ||
                (c.Description != null && c.Description.Contains(search)));
        }

        var totalCount = await query.CountAsync();
        var channels = await query
            .OrderByDescending(c => c.FollowerCount)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var viewModel = new ChannelsListViewModel
        {
            Channels = channels,
            CurrentPage = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            Search = search
        };

        return View(viewModel);
    }

    // POST: /admin/channels/{id}/verify
    [HttpPost("channels/{id}/verify")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> VerifyChannel(Guid id, bool verified)
    {
        var channel = await _context.Channels.FindAsync(id);
        if (channel == null)
        {
            return NotFound();
        }

        channel.IsVerified = verified;
        await _context.SaveChangesAsync();

        TempData["Success"] = $"Channel {(verified ? "verified" : "unverified")} successfully";
        return RedirectToAction(nameof(Channels));
    }

    // POST: /admin/channels/{id}/delete
    [HttpPost("channels/{id}/delete")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteChannel(Guid id)
    {
        var channel = await _context.Channels.FindAsync(id);
        if (channel == null)
        {
            return NotFound();
        }

        _context.Channels.Remove(channel);
        await _context.SaveChangesAsync();

        TempData["Success"] = "Channel deleted successfully";
        return RedirectToAction(nameof(Channels));
    }

    // GET: /admin/broadcast
    [HttpGet("broadcast")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    public IActionResult Broadcast()
    {
        ViewData["Title"] = "Broadcast Message";
        ViewData["ActivePage"] = "Broadcast";
        return View();
    }

    // POST: /admin/broadcast
    [HttpPost("broadcast")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Broadcast(BroadcastViewModel model)
    {
        ViewData["Title"] = "Broadcast Message";
        ViewData["ActivePage"] = "Broadcast";

        if (!ModelState.IsValid)
        {
            return View(model);
        }

        await _notificationService.SendBroadcastNotificationAsync(model.Title, model.Body);

        TempData["Success"] = "Broadcast message sent successfully";
        return View(new BroadcastViewModel());
    }
}

// View Models
public class AdminLoginViewModel
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool RememberMe { get; set; }
}

public class DashboardViewModel
{
    public int TotalUsers { get; set; }
    public int OnlineUsers { get; set; }
    public int TotalConversations { get; set; }
    public int TotalMessages { get; set; }
    public int TodayMessages { get; set; }
    public int TotalCalls { get; set; }
    public int TodayCalls { get; set; }
    public int NominalRollCount { get; set; }
    public int RegisteredCount { get; set; }
    public int TotalChannels { get; set; }
    public List<User> RecentUsers { get; set; } = new();
    public List<DailyStatDto> MessageStats { get; set; } = new();
}

public class DailyStatDto
{
    public DateTime Date { get; set; }
    public int Count { get; set; }
}

public class UsersListViewModel
{
    public List<User> Users { get; set; } = new();
    public int CurrentPage { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public string? Search { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}

public class NominalRollListViewModel
{
    public List<NominalRoll> Entries { get; set; } = new();
    public int CurrentPage { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public string? Search { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}

public class CreateNominalRollViewModel
{
    public string ServiceNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? Department { get; set; }
    public string? RankPosition { get; set; }
}

public class EditNominalRollViewModel
{
    public Guid Id { get; set; }
    public string ServiceNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? Department { get; set; }
    public string? RankPosition { get; set; }
    public UserStatus Status { get; set; }
}

public class ChannelsListViewModel
{
    public List<Channel> Channels { get; set; } = new();
    public int CurrentPage { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public string? Search { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}

public class BroadcastViewModel
{
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
}
