using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using RedPhoenix.Api.Models;
using RedPhoenix.Api.Services;

namespace RedPhoenix.Api.Controllers;

[ApiController]
[Route("[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly SmsService _smsService;
    private readonly ILogger<AdminController> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAssetService _assetService;
    private readonly IFileStorageService _storageService;

    public AdminController(IConfiguration config, SmsService smsService, ILogger<AdminController> logger, IHttpClientFactory httpClientFactory, IAssetService assetService, IFileStorageService storageService)
    {
        _config = config;
        _smsService = smsService;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _assetService = assetService;
        _storageService = storageService;
    }

    private SqlConnection CreateConnection() =>
        new(_config.GetConnectionString("DefaultConnection"));

    /// <summary>
    /// Get admin dashboard stats
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        using var conn = CreateConnection();

        var totalUsers = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users WHERE Role = 'User'");
        var mealsToday = await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM Meals WHERE CAST(CreatedAt AS DATE) = CAST(GETUTCDATE() AS DATE)");
        var activeRewards = await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM Rewards WHERE Status = 'Earned'");
        var pendingRewards = await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM Rewards WHERE Status = 'Earned'");

        var recentMeals = await conn.QueryAsync<MealDto>(
            @"SELECT TOP 10 m.Id, m.UserId, m.PhotoPath, m.ReceiptAssetId, m.ExtractedTotal, m.ExtractedDate, 
                     m.ExtractedRestaurant, m.ManualTotal, m.Status, m.CreatedAt
              FROM Meals m
              ORDER BY m.CreatedAt DESC");

        return Ok(new AdminDashboardStats
        {
            TotalUsers = totalUsers,
            MealsToday = mealsToday,
            ActiveRewards = activeRewards,
            PendingRewards = pendingRewards,
            RecentMeals = recentMeals.ToList()
        });
    }

    /// <summary>
    /// Get all users with stats
    /// </summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        using var conn = CreateConnection();

        var users = await conn.QueryAsync<UserWithStats>(
            @"SELECT u.Id, u.Phone, u.DisplayName, u.Role, u.IsActive, u.IsPhoneVerified, u.CreatedAt,
                     ISNULL(m.MealCount, 0) AS MealCount,
                     m.LastMealAt
              FROM Users u
              LEFT JOIN (
                  SELECT UserId, COUNT(*) AS MealCount, MAX(CreatedAt) AS LastMealAt
                  FROM Meals WHERE Status = 'Verified'
                  GROUP BY UserId
              ) m ON m.UserId = u.Id
              ORDER BY u.CreatedAt DESC");

        return Ok(users);
    }

    /// <summary>
    /// Update a user (admin)
    /// </summary>
    [HttpPut("users/{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
    {
        using var conn = CreateConnection();

        var user = await conn.QueryFirstOrDefaultAsync<User>(
            "SELECT * FROM Users WHERE Id = @Id", new { Id = id });

        if (user == null) return NotFound(new { message = "User not found" });

        if (request.DisplayName != null)
            user.DisplayName = request.DisplayName;
        if (request.Role != null)
            user.Role = request.Role;
        if (request.IsActive.HasValue)
            user.IsActive = request.IsActive.Value;

        await conn.ExecuteAsync(
            @"UPDATE Users SET
                DisplayName = @DisplayName,
                Role = @Role,
                IsActive = @IsActive,
                UpdatedAt = GETUTCDATE()
              WHERE Id = @Id",
            new { user.DisplayName, user.Role, user.IsActive, Id = id });

        _logger.LogInformation("User {Id} updated by admin {Admin}", id, User.Identity?.Name);
        return Ok(new { message = "User updated" });
    }

    /// <summary>
    /// Send SMS broadcast to all (or active) users
    /// </summary>
    [HttpPost("sms-broadcast")]
    public async Task<IActionResult> SendSmsBroadcast([FromBody] SmsBroadcastRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new { message = "Message is required" });

        if (request.Message.Length > 160)
            return BadRequest(new { message = "Message too long (max 160 characters)" });

        var adminUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        using var conn = CreateConnection();

        // Get recipients
        var sql = "SELECT Phone FROM Users WHERE Role = 'User' AND IsActive = 1";
        if (request.ActiveOnly)
        {
            sql = @"SELECT DISTINCT u.Phone FROM Users u
                    INNER JOIN Meals m ON m.UserId = u.Id
                    WHERE u.Role = 'User' AND u.IsActive = 1
                    AND m.CreatedAt >= DATEADD(MONTH, -3, GETUTCDATE())";
        }

        var phones = (await conn.QueryAsync<string>(sql)).ToList();

        if (phones.Count == 0)
            return BadRequest(new { message = "No recipients found" });

        // Send SMS to each user
        var successCount = 0;
        foreach (var phone in phones)
        {
            var sent = await _smsService.SendSmsAsync(phone, request.Message);
            if (sent) successCount++;
        }

        // Log broadcast
        await conn.ExecuteAsync(
            @"INSERT INTO SmsBroadcasts (AdminUserId, Message, RecipientCount, SentAt)
              VALUES (@AdminUserId, @Message, @RecipientCount, GETUTCDATE())",
            new { AdminUserId = adminUserId, request.Message, RecipientCount = successCount });

        _logger.LogInformation("SMS broadcast sent by admin {AdminId}: {Count} recipients", adminUserId, successCount);
        return Ok(new { message = $"SMS sent to {successCount}/{phones.Count} users", recipientCount = successCount });
    }

    /// <summary>
    /// Get SMS broadcast history
    /// </summary>
    [HttpGet("sms-broadcasts")]
    public async Task<IActionResult> GetSmsBroadcasts()
    {
        using var conn = CreateConnection();

        var broadcasts = await conn.QueryAsync<SmsBroadcastDto>(
            @"SELECT Id, AdminUserId, Message, RecipientCount, SentAt
              FROM SmsBroadcasts
              ORDER BY SentAt DESC");

        return Ok(broadcasts);
    }

    /// <summary>
    /// Scan an image of handwritten phone numbers using OpenAI Vision
    /// Accepts base64-encoded image in JSON body to avoid Cloudflare WAF blocking multipart uploads
    /// </summary>
    [HttpPost("phone-scan")]
    public async Task<IActionResult> ScanPhones([FromBody] PhoneScanRequest scanRequest)
    {
        try
        {
            if (string.IsNullOrEmpty(scanRequest?.ImageData))
                return BadRequest(new { message = "No image data provided" });

            // Parse data URL: "data:image/jpeg;base64,/9j/4AAQ..."
            string base64Image;
            string mimeType = "image/jpeg";

            if (scanRequest.ImageData.StartsWith("data:"))
            {
                var commaIdx = scanRequest.ImageData.IndexOf(',');
                if (commaIdx < 0)
                    return BadRequest(new { message = "Invalid image data format" });
                var header = scanRequest.ImageData[..commaIdx]; // "data:image/jpeg;base64"
                base64Image = scanRequest.ImageData[(commaIdx + 1)..];
                var mimeEnd = header.IndexOf(';');
                if (mimeEnd > 5) // after "data:"
                    mimeType = header[5..mimeEnd];
            }
            else
            {
                base64Image = scanRequest.ImageData;
            }

            // Validate size (~10MB after base64 decode)
            if (base64Image.Length > 14_000_000) // ~10MB in base64
                return BadRequest(new { message = "Image too large (max 10MB)" });

            // Send to OpenAI Vision
            var apiKey = _config["OpenAI:ApiKey"];
            if (string.IsNullOrEmpty(apiKey) || apiKey == "__OPENAI_API_KEY__")
            {
                return BadRequest(new { message = "OpenAI API key not configured" });
            }

            var requestBody = new
            {
                model = "gpt-4o",
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
                                text = @"You are reading a handwritten list of US phone numbers. Look carefully at EVERY line.

Instructions:
- Each line typically has a phone number and optionally a person's name
- Phone numbers are 10 digits, often written as XXX-XXX-XXXX or (XXX) XXX-XXXX or just 10 digits
- These are South Florida customers. Expected area codes: 954, 305, 786, 561, 754, 321, 407, 863. When a digit is ambiguous, prefer these area codes
- Read each digit carefully — handwritten 1/7, 4/9, 3/8, 5/6 can look similar
- If a checkmark ✓ or similar mark appears next to a number, ignore it — just read the number and name
- Extract the name written next to each number if visible

Respond ONLY with a JSON object (no markdown, no code blocks):
{
  ""phones"": [
    {""phone"": ""3054671234"", ""name"": ""Sharon""},
    {""phone"": ""9876543210"", ""name"": null}
  ]
}

Rules:
- Normalize to exactly 10 digits (no dashes, spaces, or parentheses)
- If a digit is truly unreadable, use your best guess based on the shape and mark ""uncertain"": true
- Do NOT skip any line — extract every phone number visible in the image
- If the image doesn't contain phone numbers, return {""phones"": []}"
                            },
                            new
                            {
                                type = "image_url",
                                image_url = new
                                {
                                    url = $"data:{mimeType};base64,{base64Image}",
                                    detail = "high"
                                }
                            }
                        }
                    }
                },
                max_tokens = 4000
            };

            var httpClient = _httpClientFactory.CreateClient("OpenAI");
            var json = JsonSerializer.Serialize(requestBody);
            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions")
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
            request.Headers.Add("Authorization", $"Bearer {apiKey}");

            var response = await httpClient.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("OpenAI API error during phone scan: {Status} {Body}", response.StatusCode, responseBody);
                return StatusCode(502, new { message = "Failed to process image with AI" });
            }

            // Parse the OpenAI response
            using var doc = JsonDocument.Parse(responseBody);
            var content = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            if (string.IsNullOrEmpty(content))
                return Ok(new ScanPhonesResponse());

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

            var scannedPhones = new List<ScannedPhone>();
            if (root.TryGetProperty("phones", out var phonesArray))
            {
                // Check existing phones in DB
                using var conn = CreateConnection();
                var existingPhones = (await conn.QueryAsync<string>("SELECT Phone FROM Users")).ToHashSet();

                foreach (var phoneEl in phonesArray.EnumerateArray())
                {
                    var phone = phoneEl.GetProperty("phone").GetString() ?? "";
                    string? name = null;
                    if (phoneEl.TryGetProperty("name", out var nameEl) && nameEl.ValueKind == JsonValueKind.String)
                        name = nameEl.GetString();
                    bool uncertain = false;
                    if (phoneEl.TryGetProperty("uncertain", out var uncertainEl))
                        uncertain = uncertainEl.ValueKind == JsonValueKind.True;

                    scannedPhones.Add(new ScannedPhone
                    {
                        Phone = phone,
                        Name = name,
                        AlreadyExists = existingPhones.Contains(phone),
                        Uncertain = uncertain
                    });
                }
            }

            // Save image via Asset system and record in PhoneScans
            int? scanId = null;
            try
            {
                var imageBytes = Convert.FromBase64String(base64Image);
                var ext = mimeType switch
                {
                    "image/png" => ".png",
                    "image/gif" => ".gif",
                    "image/webp" => ".webp",
                    _ => ".jpg"
                };

                var adminUserId = int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : (int?)null;

                // Step 1: Create asset record to get ID
                var asset = new Asset
                {
                    AssetType = "phone-scan",
                    FileName = $"phone-scan{ext}",
                    ContentType = mimeType,
                    FileSize = imageBytes.Length,
                    StorageUrl = string.Empty,
                    StorageType = _storageService.StorageType,
                    SiteKey = "usushi",
                    UploadedBy = adminUserId,
                    IsPublic = true
                };
                asset = await _assetService.CreateAsync(asset);

                // Step 2: Save file to disk named by asset ID
                using var memStream = new MemoryStream(imageBytes);
                var storageUrl = await _storageService.UploadFileAsync(memStream, asset.FileName, asset.Id, asset.SiteKey);
                await _assetService.UpdateStorageUrlAsync(asset.Id, storageUrl);

                // Step 3: Insert PhoneScans record with asset FK
                using var conn2 = CreateConnection();
                var scannedDataJson = JsonSerializer.Serialize(scannedPhones);

                scanId = await conn2.ExecuteScalarAsync<int>(
                    @"INSERT INTO PhoneScans (ImageAssetId, ScannedData, ScannedBy)
                      VALUES (@ImageAssetId, @ScannedData, @ScannedBy);
                      SELECT CAST(SCOPE_IDENTITY() AS INT);",
                    new { ImageAssetId = asset.Id, ScannedData = scannedDataJson, ScannedBy = adminUserId });
            }
            catch (Exception saveEx)
            {
                _logger.LogWarning(saveEx, "Failed to save phone scan image (scan results still returned)");
            }

            _logger.LogInformation("Phone scan completed: {Count} numbers found, ScanId={ScanId}", scannedPhones.Count, scanId);
            return Ok(new ScanPhonesResponse { ScanId = scanId, Phones = scannedPhones });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scanning phone numbers from image");
            return StatusCode(500, new { message = "Failed to scan phone numbers: " + ex.Message });
        }
    }

    /// <summary>
    /// Import confirmed phone numbers as unverified users
    /// </summary>
    [HttpPost("import-phones")]
    public async Task<IActionResult> ImportPhones([FromBody] ImportPhonesRequest request)
    {
        if (request.Phones == null || request.Phones.Count == 0)
            return BadRequest(new { message = "No phone numbers provided" });

        using var conn = CreateConnection();
        var importedPhones = new List<string>();
        var skippedCount = 0;

        foreach (var phone in request.Phones)
        {
            // Check if user already exists
            var existing = await conn.QueryFirstOrDefaultAsync<User>(
                "SELECT Id FROM Users WHERE Phone = @Phone",
                new { Phone = phone });

            if (existing != null)
            {
                skippedCount++;
                continue;
            }

            // Create unverified user
            await conn.ExecuteAsync(
                @"INSERT INTO Users (Phone, Role, IsActive, IsPhoneVerified, CreatedAt)
                  VALUES (@Phone, 'User', 1, 0, GETUTCDATE())",
                new { Phone = phone });

            importedPhones.Add(phone);
        }

        _logger.LogInformation("Phone import: {Imported} imported, {Skipped} skipped", importedPhones.Count, skippedCount);

        return Ok(new ImportPhonesResponse
        {
            ImportedCount = importedPhones.Count,
            SkippedCount = skippedCount,
            ImportedPhones = importedPhones
        });
    }

    /// <summary>
    /// Send a test SMS to a specific user
    /// </summary>
    [HttpPost("test-sms/{userId}")]
    public async Task<IActionResult> SendTestSms(int userId, [FromBody] TestSmsRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new { message = "Message is required" });

        if (request.Message.Length > 160)
            return BadRequest(new { message = "Message too long (max 160 characters)" });

        using var conn = CreateConnection();
        var user = await conn.QueryFirstOrDefaultAsync<User>(
            "SELECT * FROM Users WHERE Id = @Id",
            new { Id = userId });

        if (user == null)
            return NotFound(new { message = "User not found" });

        var sent = await _smsService.SendSmsAsync(user.Phone, request.Message);

        if (sent)
        {
            _logger.LogInformation("Test SMS sent to user {UserId} ({Phone})", userId, user.Phone);
            return Ok(new { message = $"SMS sent to {user.Phone}" });
        }

        return StatusCode(502, new { message = "Failed to send SMS" });
    }

    /// <summary>
    /// Get all phone scan history
    /// </summary>
    [HttpGet("phone-scans")]
    public async Task<IActionResult> GetPhoneScans()
    {
        using var conn = CreateConnection();

        var scans = await conn.QueryAsync<PhoneScan>(
            @"SELECT Id, ImageAssetId, ScannedData, ScannedBy, ScannedAt, ReviewedAt, ReviewedBy, Notes
              FROM PhoneScans
              ORDER BY ScannedAt DESC");

        var dtos = scans.Select(s => new PhoneScanDto
        {
            Id = s.Id,
            ImageAssetId = s.ImageAssetId,
            ImageUrl = s.ImageAssetId.HasValue ? $"/asset/{s.ImageAssetId}" : "",
            ScannedData = s.ScannedData,
            ScannedBy = s.ScannedBy,
            ScannedAt = s.ScannedAt,
            ReviewedAt = s.ReviewedAt,
            ReviewedBy = s.ReviewedBy,
            Notes = s.Notes
        }).ToList();

        return Ok(dtos);
    }

    /// <summary>
    /// Review (mark as reviewed) a phone scan
    /// </summary>
    [HttpPost("phone-scans/{id}/review")]
    public async Task<IActionResult> ReviewPhoneScan(int id, [FromBody] ReviewPhoneScanRequest request)
    {
        using var conn = CreateConnection();

        var scan = await conn.QueryFirstOrDefaultAsync<PhoneScan>(
            "SELECT Id FROM PhoneScans WHERE Id = @Id", new { Id = id });

        if (scan == null)
            return NotFound(new { message = "Phone scan not found" });

        var adminUserId = int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : (int?)null;

        await conn.ExecuteAsync(
            @"UPDATE PhoneScans SET ReviewedAt = SYSUTCDATETIME(), ReviewedBy = @ReviewedBy, Notes = @Notes
              WHERE Id = @Id",
            new { ReviewedBy = adminUserId, Notes = request.Notes, Id = id });

        _logger.LogInformation("Phone scan {Id} reviewed by admin {AdminId}", id, adminUserId);
        return Ok(new { message = "Scan marked as reviewed" });
    }
}
