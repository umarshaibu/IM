using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using IM.Core.Interfaces;

namespace IM.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;
    private readonly string _smtpHost;
    private readonly int _smtpPort;
    private readonly string _smtpUsername;
    private readonly string _smtpPassword;
    private readonly string _fromEmail;
    private readonly string _fromName;
    private readonly bool _enableSsl;
    private readonly bool _isEnabled;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;

        _smtpHost = _configuration["Email:SmtpHost"] ?? "";
        _smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
        _smtpUsername = _configuration["Email:Username"] ?? "";
        _smtpPassword = _configuration["Email:Password"] ?? "";
        _fromEmail = _configuration["Email:FromEmail"] ?? "";
        _fromName = _configuration["Email:FromName"] ?? "IM App";
        _enableSsl = bool.Parse(_configuration["Email:EnableSsl"] ?? "true");
        _isEnabled = !string.IsNullOrEmpty(_smtpHost) && !string.IsNullOrEmpty(_smtpUsername);
    }

    public async Task<bool> SendAsync(string to, string subject, string body)
    {
        if (!_isEnabled)
        {
            _logger.LogWarning("Email service is not configured. Would send to {To}: {Subject}", to, subject);
            return false;
        }

        try
        {
            using var client = new SmtpClient(_smtpHost, _smtpPort)
            {
                Credentials = new NetworkCredential(_smtpUsername, _smtpPassword),
                EnableSsl = _enableSsl
            };

            var message = new MailMessage
            {
                From = new MailAddress(_fromEmail, _fromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };
            message.To.Add(to);

            await client.SendMailAsync(message);
            _logger.LogInformation("Email sent successfully to {To}", to);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}", to);
            return false;
        }
    }

    public async Task<bool> SendVerificationCodeAsync(string to, string code, string fullName)
    {
        var subject = "IM - Your Verification Code";
        var body = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
</head>
<body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;'>
    <div style='background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);'>
        <div style='text-align: center; margin-bottom: 30px;'>
            <h1 style='color: #1B84FF; margin: 0;'>IM</h1>
            <p style='color: #666; margin: 5px 0 0 0;'>Secure Messaging</p>
        </div>

        <h2 style='color: #333; margin-bottom: 20px;'>Hello {fullName},</h2>

        <p style='color: #666; font-size: 16px; line-height: 1.5;'>
            Your verification code for IM is:
        </p>

        <div style='background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;'>
            <span style='font-size: 32px; font-weight: bold; color: #1B84FF; letter-spacing: 8px;'>{code}</span>
        </div>

        <p style='color: #666; font-size: 14px; line-height: 1.5;'>
            This code will expire in <strong>10 minutes</strong>.
        </p>

        <p style='color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;'>
            If you did not request this code, please ignore this email. Do not share this code with anyone.
        </p>
    </div>
</body>
</html>";

        return await SendAsync(to, subject, body);
    }
}
