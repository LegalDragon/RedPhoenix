using System.Text;
using System.Text.Json;

namespace RedPhoenix.Api.Services;

public class SmsService
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmsService> _logger;
    private readonly HttpClient _httpClient;

    public SmsService(IConfiguration config, ILogger<SmsService> logger, IHttpClientFactory httpClientFactory)
    {
        _config = config;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("SmsGateway");
    }

    public async Task<bool> SendSmsAsync(string toPhone, string message)
    {
        var gatewayUrl = _config["Sms:GatewayUrl"] ?? "https://pie.funtimepb.com/v2/sms/send";
        var fromPhone = _config["Sms:FromNumber"] ?? "9544665557";

        try
        {
            var payload = new
            {
                From = fromPhone,
                To = toPhone,
                Body = message,
                Media = ""
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(gatewayUrl, content);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("SMS sent to {Phone}", toPhone);
                return true;
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            _logger.LogWarning("SMS send failed to {Phone}: {Status} {Body}", toPhone, response.StatusCode, responseBody);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SMS send error to {Phone}", toPhone);
            return false;
        }
    }

    public string GenerateOtpCode()
    {
        return Random.Shared.Next(100000, 999999).ToString();
    }
}
