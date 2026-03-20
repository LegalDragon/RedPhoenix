using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace RedPhoenix.Api.Services;

public class ReceiptService
{
    private readonly IConfiguration _config;
    private readonly ILogger<ReceiptService> _logger;
    private readonly HttpClient _httpClient;

    public ReceiptService(IConfiguration config, ILogger<ReceiptService> logger, IHttpClientFactory httpClientFactory)
    {
        _config = config;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("OpenAI");
    }

    public record ReceiptData(decimal? Total, string? Date, string? Restaurant, bool Confident);

    public async Task<ReceiptData> ExtractReceiptDataAsync(string imagePath)
    {
        var apiKey = _config["OpenAI:ApiKey"];
        if (string.IsNullOrEmpty(apiKey) || apiKey == "__OPENAI_API_KEY__")
        {
            _logger.LogWarning("OpenAI API key not configured, returning needs-manual-entry");
            return new ReceiptData(null, null, null, false);
        }

        try
        {
            // Read image and convert to base64
            var imageBytes = await File.ReadAllBytesAsync(imagePath);
            var base64Image = Convert.ToBase64String(imageBytes);
            var extension = Path.GetExtension(imagePath).ToLowerInvariant();
            var mimeType = extension switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".gif" => "image/gif",
                ".webp" => "image/webp",
                _ => "image/jpeg"
            };

            var requestBody = new
            {
                model = "gpt-4o-mini",
                messages = new object[]
                {
                    new
                    {
                        role = "user",
                        content = new object[]
                        {
                            new
                            {
                                type = "text",
                                text = @"Analyze this restaurant receipt image. Extract the following information and respond ONLY with a JSON object (no markdown, no code blocks):
{
  ""total"": <number or null if not found>,
  ""date"": ""<date string or null if not found>"",
  ""restaurant"": ""<restaurant name or null if not found>"",
  ""confident"": <true if you can clearly read the total amount, false otherwise>
}

Be strict: if the image is not a receipt or you cannot read the total amount clearly, set confident to false."
                            },
                            new
                            {
                                type = "image_url",
                                image_url = new
                                {
                                    url = $"data:{mimeType};base64,{base64Image}",
                                    detail = "low"
                                }
                            }
                        }
                    }
                },
                max_tokens = 300
            };

            var json = JsonSerializer.Serialize(requestBody);
            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions")
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
            request.Headers.Add("Authorization", $"Bearer {apiKey}");

            var response = await _httpClient.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("OpenAI API error: {Status} {Body}", response.StatusCode, responseBody);
                return new ReceiptData(null, null, null, false);
            }

            // Parse the OpenAI response
            using var doc = JsonDocument.Parse(responseBody);
            var content = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            if (string.IsNullOrEmpty(content))
                return new ReceiptData(null, null, null, false);

            // Clean content - remove markdown code blocks if present
            content = content.Trim();
            if (content.StartsWith("```"))
            {
                var firstNewline = content.IndexOf('\n');
                if (firstNewline >= 0)
                    content = content[(firstNewline + 1)..];
                if (content.EndsWith("```"))
                    content = content[..^3];
                content = content.Trim();
            }

            using var resultDoc = JsonDocument.Parse(content);
            var root = resultDoc.RootElement;

            decimal? total = null;
            if (root.TryGetProperty("total", out var totalEl) && totalEl.ValueKind == JsonValueKind.Number)
                total = totalEl.GetDecimal();

            string? date = null;
            if (root.TryGetProperty("date", out var dateEl) && dateEl.ValueKind == JsonValueKind.String)
                date = dateEl.GetString();

            string? restaurant = null;
            if (root.TryGetProperty("restaurant", out var restEl) && restEl.ValueKind == JsonValueKind.String)
                restaurant = restEl.GetString();

            bool confident = false;
            if (root.TryGetProperty("confident", out var confEl))
                confident = confEl.ValueKind == JsonValueKind.True;

            _logger.LogInformation("Receipt extracted: total={Total}, date={Date}, restaurant={Restaurant}, confident={Confident}",
                total, date, restaurant, confident);

            return new ReceiptData(total, date, restaurant, confident);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting receipt data");
            return new ReceiptData(null, null, null, false);
        }
    }
}
