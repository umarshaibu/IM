using IM.Core.Entities;

namespace IM.Core.Interfaces;

public interface IAuthService
{
    Task<(bool Success, string? FullName, string? MaskedEmail, string? MaskedPhone, string? Message)> RequestLoginTokenAsync(string serviceNumber);
    Task<(User? User, string? AccessToken, string? RefreshToken)> VerifyLoginTokenAsync(string serviceNumber, string token);
    Task<(string? AccessToken, string? RefreshToken)> RefreshTokenAsync(string refreshToken);
    Task<bool> LogoutAsync(Guid userId);
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
}
