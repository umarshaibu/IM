namespace IM.Core.Interfaces;

public interface ISmsService
{
    Task<bool> SendAsync(string phoneNumber, string message);
    Task<bool> SendVerificationCodeAsync(string phoneNumber, string code);
}
