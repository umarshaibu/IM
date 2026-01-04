namespace IM.Core.Interfaces;

public interface IEmailService
{
    Task<bool> SendAsync(string to, string subject, string body);
    Task<bool> SendVerificationCodeAsync(string to, string code, string fullName);
}
