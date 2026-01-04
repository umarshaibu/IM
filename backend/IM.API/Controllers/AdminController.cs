using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IM.API.DTOs;
using IM.Core.Entities;
using IM.Core.Enums;
using IM.Core.Interfaces;
using IM.Infrastructure.Data;

namespace IM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationService _notificationService;

    public AdminController(ApplicationDbContext context, INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    // Nominal Roll Management
    [HttpGet("nominal-roll")]
    public async Task<ActionResult<IEnumerable<NominalRollDto>>> GetNominalRoll([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var nominalRolls = await _context.NominalRolls
            .Include(n => n.User)
            .OrderBy(n => n.ServiceNumber)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(nominalRolls.Select(n => new NominalRollDto
        {
            Id = n.Id,
            ServiceNumber = n.ServiceNumber,
            FullName = n.FullName,
            PhoneNumber = n.PhoneNumber,
            Email = n.Email,
            Department = n.Department,
            RankPosition = n.RankPosition,
            Status = n.Status,
            IsRegistered = n.User != null,
            CreatedAt = n.CreatedAt,
            UpdatedAt = n.UpdatedAt
        }));
    }

    [HttpGet("nominal-roll/{id}")]
    public async Task<ActionResult<NominalRollDto>> GetNominalRollEntry(Guid id)
    {
        var entry = await _context.NominalRolls
            .Include(n => n.User)
            .FirstOrDefaultAsync(n => n.Id == id);

        if (entry == null)
        {
            return NotFound();
        }

        return Ok(new NominalRollDto
        {
            Id = entry.Id,
            ServiceNumber = entry.ServiceNumber,
            FullName = entry.FullName,
            PhoneNumber = entry.PhoneNumber,
            Email = entry.Email,
            Department = entry.Department,
            RankPosition = entry.RankPosition,
            Status = entry.Status,
            IsRegistered = entry.User != null,
            CreatedAt = entry.CreatedAt,
            UpdatedAt = entry.UpdatedAt
        });
    }

    [HttpPost("nominal-roll")]
    public async Task<ActionResult<NominalRollDto>> CreateNominalRollEntry([FromBody] CreateNominalRollRequest request)
    {
        // Check if service number already exists
        var exists = await _context.NominalRolls.AnyAsync(n => n.ServiceNumber == request.ServiceNumber);
        if (exists)
        {
            return BadRequest(new { message = "Service number already exists" });
        }

        var entry = new NominalRoll
        {
            ServiceNumber = request.ServiceNumber,
            FullName = request.FullName,
            PhoneNumber = request.PhoneNumber,
            Email = request.Email,
            Department = request.Department,
            RankPosition = request.RankPosition,
            Status = UserStatus.Active
        };

        await _context.NominalRolls.AddAsync(entry);
        await _context.SaveChangesAsync();

        return Ok(new NominalRollDto
        {
            Id = entry.Id,
            ServiceNumber = entry.ServiceNumber,
            FullName = entry.FullName,
            PhoneNumber = entry.PhoneNumber,
            Email = entry.Email,
            Department = entry.Department,
            RankPosition = entry.RankPosition,
            Status = entry.Status,
            IsRegistered = false,
            CreatedAt = entry.CreatedAt,
            UpdatedAt = entry.UpdatedAt
        });
    }

    [HttpPut("nominal-roll/{id}")]
    public async Task<ActionResult> UpdateNominalRollEntry(Guid id, [FromBody] UpdateNominalRollRequest request)
    {
        var entry = await _context.NominalRolls.FindAsync(id);
        if (entry == null)
        {
            return NotFound();
        }

        if (request.FullName != null)
            entry.FullName = request.FullName;
        if (request.PhoneNumber != null)
            entry.PhoneNumber = request.PhoneNumber;
        if (request.Email != null)
            entry.Email = request.Email;
        if (request.Department != null)
            entry.Department = request.Department;
        if (request.RankPosition != null)
            entry.RankPosition = request.RankPosition;
        if (request.Status.HasValue)
            entry.Status = request.Status.Value;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Nominal roll entry updated" });
    }

    [HttpDelete("nominal-roll/{id}")]
    public async Task<ActionResult> DeleteNominalRollEntry(Guid id)
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
            return BadRequest(new { message = "Cannot delete nominal roll entry with registered user" });
        }

        _context.NominalRolls.Remove(entry);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Nominal roll entry deleted" });
    }

    [HttpPost("nominal-roll/bulk")]
    public async Task<ActionResult<BulkImportResult>> BulkImportNominalRoll(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file provided" });
        }

        var result = new BulkImportResult();
        var entries = new List<NominalRoll>();

        try
        {
            using var reader = new StreamReader(file.OpenReadStream());
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null
            };
            using var csv = new CsvReader(reader, config);

            var records = csv.GetRecords<dynamic>();
            foreach (var record in records)
            {
                result.TotalRecords++;

                try
                {
                    var dict = (IDictionary<string, object>)record;
                    var serviceNumber = dict.ContainsKey("ServiceNumber") ? dict["ServiceNumber"]?.ToString() : null;
                    var fullName = dict.ContainsKey("FullName") ? dict["FullName"]?.ToString() : null;

                    if (string.IsNullOrEmpty(serviceNumber) || string.IsNullOrEmpty(fullName))
                    {
                        result.FailureCount++;
                        result.Errors.Add($"Row {result.TotalRecords}: Missing ServiceNumber or FullName");
                        continue;
                    }

                    // Check if already exists
                    var exists = await _context.NominalRolls.AnyAsync(n => n.ServiceNumber == serviceNumber);
                    if (exists)
                    {
                        result.FailureCount++;
                        result.Errors.Add($"Row {result.TotalRecords}: Service number {serviceNumber} already exists");
                        continue;
                    }

                    var entry = new NominalRoll
                    {
                        ServiceNumber = serviceNumber,
                        FullName = fullName,
                        PhoneNumber = dict.ContainsKey("PhoneNumber") ? dict["PhoneNumber"]?.ToString() : null,
                        Email = dict.ContainsKey("Email") ? dict["Email"]?.ToString() : null,
                        Department = dict.ContainsKey("Department") ? dict["Department"]?.ToString() : null,
                        RankPosition = dict.ContainsKey("RankPosition") ? dict["RankPosition"]?.ToString() : null,
                        Status = UserStatus.Active
                    };

                    entries.Add(entry);
                    result.SuccessCount++;
                }
                catch (Exception ex)
                {
                    result.FailureCount++;
                    result.Errors.Add($"Row {result.TotalRecords}: {ex.Message}");
                }
            }

            if (entries.Any())
            {
                await _context.NominalRolls.AddRangeAsync(entries);
                await _context.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Failed to process file: {ex.Message}" });
        }

        return Ok(result);
    }

    // User Management
    [HttpGet("users")]
    public async Task<ActionResult<IEnumerable<AdminUserDto>>> GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var users = await _context.Users
            .Include(u => u.NominalRoll)
            .OrderBy(u => u.NominalRoll.ServiceNumber)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(users.Select(u => new AdminUserDto
        {
            Id = u.Id,
            ServiceNumber = u.NominalRoll.ServiceNumber,
            FullName = u.NominalRoll.FullName,
            PhoneNumber = u.PhoneNumber,
            Email = u.Email ?? u.NominalRoll.Email,
            DisplayName = u.DisplayName,
            Department = u.NominalRoll.Department,
            RankPosition = u.NominalRoll.RankPosition,
            IsOnline = u.IsOnline,
            LastSeen = u.LastSeen,
            CreatedAt = u.CreatedAt,
            Status = u.NominalRoll.Status
        }));
    }

    [HttpPut("users/{id}/status")]
    public async Task<ActionResult> UpdateUserStatus(Guid id, [FromBody] UpdateUserStatusRequest request)
    {
        var user = await _context.Users
            .Include(u => u.NominalRoll)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
        {
            return NotFound();
        }

        user.NominalRoll.Status = request.Status;
        await _context.SaveChangesAsync();

        return Ok(new { message = "User status updated" });
    }

    // Broadcast
    [HttpPost("broadcast")]
    public async Task<ActionResult> SendBroadcast([FromBody] BroadcastMessageRequest request)
    {
        await _notificationService.SendBroadcastNotificationAsync(request.Title, request.Body);
        return Ok(new { message = "Broadcast sent" });
    }

    // Analytics
    [HttpGet("analytics")]
    public async Task<ActionResult<AnalyticsDto>> GetAnalytics()
    {
        var today = DateTime.UtcNow.Date;

        var analytics = new AnalyticsDto
        {
            TotalUsers = await _context.Users.CountAsync(),
            OnlineUsers = await _context.Users.CountAsync(u => u.IsOnline),
            TotalConversations = await _context.Conversations.CountAsync(),
            TotalMessages = await _context.Messages.CountAsync(),
            TodayMessages = await _context.Messages.CountAsync(m => m.CreatedAt >= today),
            TotalCalls = await _context.Calls.CountAsync(),
            TodayCalls = await _context.Calls.CountAsync(c => c.StartedAt >= today),
            NominalRollCount = await _context.NominalRolls.CountAsync(),
            RegisteredCount = await _context.NominalRolls.CountAsync(n => n.User != null)
        };

        return Ok(analytics);
    }
}
