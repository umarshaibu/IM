using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using IM.Core.Interfaces;

namespace IM.Infrastructure.Services;

public class SmsService : ISmsService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SmsService> _logger;
    private readonly HttpClient _httpClient;
    private readonly string _apiUrl;
    private readonly string _apiKey;
    private readonly string _senderId;
    private readonly bool _isEnabled;

    public SmsService(IConfiguration configuration, ILogger<SmsService> logger, IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient();

        _apiUrl = _configuration["Sms:ApiUrl"] ?? "";
        _apiKey = _configuration["Sms:ApiKey"] ?? "";
        _senderId = _configuration["Sms:SenderId"] ?? "IM";
        _isEnabled = !string.IsNullOrEmpty(_apiUrl) && !string.IsNullOrEmpty(_apiKey);
    }

    public async Task<bool> SendAsync(string phoneNumber, string message)
    {
        if (!_isEnabled)
        {
            _logger.LogWarning("SMS service is not configured. Would send to {PhoneNumber}: {Message}", phoneNumber, message);
            return false;
        }

        try
        {
            // Normalize phone number (remove spaces, dashes)
            phoneNumber = NormalizePhoneNumber(phoneNumber);

            // Generic SMS API payload - adjust based on your SMS provider
            var payload = new
            {
                to = phoneNumber,
                from = _senderId,
                message = message,
                api_key = _apiKey
            };

            var content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json"
            );

            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _apiKey);

            var response = await _httpClient.PostAsync(_apiUrl, content);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("SMS sent successfully to {PhoneNumber}", phoneNumber);
                return true;
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            _logger.LogError("SMS API returned error. Status: {Status}, Response: {Response}",
                response.StatusCode, responseBody);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send SMS to {PhoneNumber}", phoneNumber);
            return false;
        }
    }

    public async Task<bool> SendVerificationCodeAsync(string phoneNumber, string code)
    {
        var message = $"Your IM verification code is: {code}. This code expires in 10 minutes. Do not share this code.";
        return await SendAsync(phoneNumber, message);
    }

    private string NormalizePhoneNumber(string phoneNumber)
    {
        // Remove spaces, dashes, parentheses
        var normalized = new string(phoneNumber.Where(c => char.IsDigit(c) || c == '+').ToArray());

        // Ensure it starts with + for international format
        if (!normalized.StartsWith("+"))
        {
            // Assume Nigerian number if no country code
            if (normalized.StartsWith("0"))
            {
                normalized = "+234" + normalized.Substring(1);
            }
            else
            {
                normalized = "+" + normalized;
            }
        }

        return normalized;
    }
}
