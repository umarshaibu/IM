using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using IM.Core.Entities;
using IM.Core.Enums;
using IM.Core.Interfaces;
using IM.Infrastructure.Data;

namespace IM.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;
    private const int TOKEN_EXPIRY_MINUTES = 10;
    private const int MAX_ATTEMPTS = 5;

    public AuthService(ApplicationDbContext context, IConfiguration configuration, ILogger<AuthService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<(bool Success, string? FullName, string? MaskedEmail, string? MaskedPhone, string? Message)> RequestLoginTokenAsync(string serviceNumber)
    {
        var nominalRoll = await _context.NominalRolls
            .FirstOrDefaultAsync(n => n.ServiceNumber == serviceNumber && n.Status == UserStatus.Active);

        if (nominalRoll == null)
        {
            return (false, null, null, null, "Service number not found or inactive");
        }

        // Invalidate any existing tokens for this user
        var existingTokens = await _context.LoginTokens
            .Where(t => t.NominalRollId == nominalRoll.Id && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();

        foreach (var token in existingTokens)
        {
            token.IsUsed = true;
        }

        // Generate a 6-digit token
        var tokenCode = GenerateNumericToken(6);

        var loginToken = new LoginToken
        {
            NominalRollId = nominalRoll.Id,
            Token = tokenCode,
            ExpiresAt = DateTime.UtcNow.AddMinutes(TOKEN_EXPIRY_MINUTES),
            IsUsed = false,
            AttemptCount = 0
        };

        await _context.LoginTokens.AddAsync(loginToken);
        await _context.SaveChangesAsync();

        // Get user info for masking (check if user exists)
        var user = await _context.Users.FirstOrDefaultAsync(u => u.NominalRollId == nominalRoll.Id);

        string? maskedEmail = null;
        string? maskedPhone = null;

        if (user != null)
        {
            maskedPhone = MaskPhoneNumber(user.PhoneNumber);
        }
        else if (!string.IsNullOrEmpty(nominalRoll.PhoneNumber))
        {
            maskedPhone = MaskPhoneNumber(nominalRoll.PhoneNumber);
        }

        // For now, we'll use a placeholder email based on service number
        // In production, you'd have actual email in NominalRoll
        maskedEmail = MaskEmail($"{serviceNumber.ToLower().Replace("/", ".")}@org.gov");

        // Log the token (in production, send via SMS/Email)
        _logger.LogInformation("Login token for {ServiceNumber}: {Token}", serviceNumber, tokenCode);

        // TODO: In production, send token via SMS and Email services
        // await _smsService.SendAsync(phone, $"Your IM verification code is: {tokenCode}");
        // await _emailService.SendAsync(email, "IM Verification Code", $"Your code is: {tokenCode}");

        return (true, nominalRoll.FullName, maskedEmail, maskedPhone, null);
    }

    public async Task<(User? User, string? AccessToken, string? RefreshToken)> VerifyLoginTokenAsync(string serviceNumber, string token)
    {
        var nominalRoll = await _context.NominalRolls
            .FirstOrDefaultAsync(n => n.ServiceNumber == serviceNumber && n.Status == UserStatus.Active);

        if (nominalRoll == null)
        {
            return (null, null, null);
        }

        var loginToken = await _context.LoginTokens
            .Where(t => t.NominalRollId == nominalRoll.Id && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync();

        if (loginToken == null)
        {
            return (null, null, null);
        }

        // Check attempt count
        if (loginToken.AttemptCount >= MAX_ATTEMPTS)
        {
            loginToken.IsUsed = true;
            await _context.SaveChangesAsync();
            return (null, null, null);
        }

        // Verify token
        if (loginToken.Token != token)
        {
            loginToken.AttemptCount++;
            await _context.SaveChangesAsync();
            return (null, null, null);
        }

        // Mark token as used
        loginToken.IsUsed = true;

        // Get or create user
        var user = await _context.Users.FirstOrDefaultAsync(u => u.NominalRollId == nominalRoll.Id);

        if (user == null)
        {
            // Auto-register user on first login
            user = new User
            {
                NominalRollId = nominalRoll.Id,
                PhoneNumber = nominalRoll.PhoneNumber ?? $"+234{new Random().NextInt64(7000000000, 9999999999)}",
                DisplayName = nominalRoll.FullName,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()), // Random password since we use token auth
            };

            await _context.Users.AddAsync(user);
        }

        // Generate tokens
        var accessToken = GenerateAccessToken(user);
        var refreshToken = GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        user.IsOnline = true;
        user.LastSeen = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return (user, accessToken, refreshToken);
    }

    public async Task<(string? AccessToken, string? RefreshToken)> RefreshTokenAsync(string refreshToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.RefreshToken == refreshToken && u.RefreshTokenExpiryTime > DateTime.UtcNow);

        if (user == null)
            return (null, null);

        var newAccessToken = GenerateAccessToken(user);
        var newRefreshToken = GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);

        await _context.SaveChangesAsync();

        return (newAccessToken, newRefreshToken);
    }

    public async Task<bool> LogoutAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return false;

        user.RefreshToken = null;
        user.RefreshTokenExpiryTime = null;
        user.IsOnline = false;
        user.LastSeen = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public string GenerateAccessToken(User user)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.MobilePhone, user.PhoneNumber),
            new Claim(ClaimTypes.Name, user.DisplayName ?? ""),
            new Claim("NominalRollId", user.NominalRollId.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(int.Parse(jwtSettings["ExpiryMinutes"]!)),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var randomNumber = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    private static string GenerateNumericToken(int length)
    {
        var random = new Random();
        var token = new StringBuilder();
        for (int i = 0; i < length; i++)
        {
            token.Append(random.Next(0, 10));
        }
        return token.ToString();
    }

    private static string MaskPhoneNumber(string phone)
    {
        if (string.IsNullOrEmpty(phone) || phone.Length < 6)
            return "***";

        return $"{phone[..3]}****{phone[^3..]}";
    }

    private static string MaskEmail(string email)
    {
        if (string.IsNullOrEmpty(email))
            return "***";

        var parts = email.Split('@');
        if (parts.Length != 2)
            return "***";

        var name = parts[0];
        var domain = parts[1];

        if (name.Length <= 2)
            return $"**@{domain}";

        return $"{name[0]}***{name[^1]}@{domain}";
    }
}
