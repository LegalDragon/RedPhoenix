using System.Security.Claims;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using RedPhoenix.Api.Models;
using RedPhoenix.Api.Services;

namespace RedPhoenix.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class AuthController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly AuthService _authService;
    private readonly SmsService _smsService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IConfiguration config, AuthService authService, SmsService smsService, ILogger<AuthController> logger)
    {
        _config = config;
        _authService = authService;
        _smsService = smsService;
        _logger = logger;
    }

    private SqlConnection CreateConnection() =>
        new(_config.GetConnectionString("DefaultConnection"));

    /// <summary>
    /// Step 1: Send OTP to phone number
    /// </summary>
    [HttpPost("send-otp")]
    public async Task<IActionResult> SendOtp([FromBody] SendOtpRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Phone))
            return BadRequest(new { message = "Phone number is required" });

        // Normalize phone (strip non-digits)
        var phone = new string(request.Phone.Where(char.IsDigit).ToArray());
        if (phone.Length < 10)
            return BadRequest(new { message = "Invalid phone number" });

        using var conn = CreateConnection();

        // Check for recent unused OTP (rate limiting - max 1 per minute)
        var recentOtp = await conn.QueryFirstOrDefaultAsync<OtpCode>(
            @"SELECT TOP 1 * FROM OtpCodes 
              WHERE Phone = @Phone AND IsUsed = 0 AND CreatedAt > DATEADD(MINUTE, -1, GETUTCDATE())
              ORDER BY CreatedAt DESC",
            new { Phone = phone });

        if (recentOtp != null)
            return BadRequest(new { message = "Please wait before requesting another code" });

        // Generate and store OTP
        var code = _smsService.GenerateOtpCode();
        await conn.ExecuteAsync(
            @"INSERT INTO OtpCodes (Phone, Code, ExpiresAt, Attempts, IsUsed, CreatedAt)
              VALUES (@Phone, @Code, DATEADD(MINUTE, 5, GETUTCDATE()), 0, 0, GETUTCDATE())",
            new { Phone = phone, Code = code });

        // Send SMS
        var message = $"Your USushi verification code is: {code}. It expires in 5 minutes.";
        var sent = await _smsService.SendSmsAsync(phone, message);

        if (!sent)
            _logger.LogWarning("Failed to send OTP SMS to {Phone}, code={Code}", phone, code);

        // Always return success to prevent phone enumeration
        return Ok(new { message = "Verification code sent" });
    }

    /// <summary>
    /// Step 2: Verify OTP and get JWT token
    /// </summary>
    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Code))
            return BadRequest(new { message = "Phone and code are required" });

        var phone = new string(request.Phone.Where(char.IsDigit).ToArray());

        using var conn = CreateConnection();

        // Find the latest unused, non-expired OTP for this phone
        var otp = await conn.QueryFirstOrDefaultAsync<OtpCode>(
            @"SELECT TOP 1 * FROM OtpCodes
              WHERE Phone = @Phone AND IsUsed = 0 AND ExpiresAt > GETUTCDATE()
              ORDER BY CreatedAt DESC",
            new { Phone = phone });

        if (otp == null)
            return Unauthorized(new { message = "No valid verification code found. Please request a new one." });

        // Check max attempts
        if (otp.Attempts >= 3)
        {
            await conn.ExecuteAsync("UPDATE OtpCodes SET IsUsed = 1 WHERE Id = @Id", new { otp.Id });
            return Unauthorized(new { message = "Too many attempts. Please request a new code." });
        }

        // Increment attempts
        await conn.ExecuteAsync("UPDATE OtpCodes SET Attempts = Attempts + 1 WHERE Id = @Id", new { otp.Id });

        // Verify code
        if (otp.Code != request.Code)
            return Unauthorized(new { message = $"Invalid code. {2 - otp.Attempts} attempts remaining." });

        // Mark OTP as used
        await conn.ExecuteAsync("UPDATE OtpCodes SET IsUsed = 1 WHERE Id = @Id", new { otp.Id });

        // Get or create user
        var user = await conn.QueryFirstOrDefaultAsync<User>(
            "SELECT * FROM Users WHERE Phone = @Phone", new { Phone = phone });

        if (user == null)
        {
            // Auto-register new user
            var id = await conn.QuerySingleAsync<int>(
                @"INSERT INTO Users (Phone, Role, IsActive, CreatedAt)
                  OUTPUT INSERTED.Id
                  VALUES (@Phone, 'User', 1, GETUTCDATE())",
                new { Phone = phone });

            user = new User { Id = id, Phone = phone, Role = "User", IsActive = true };
            _logger.LogInformation("New user registered: {Phone}", phone);
        }
        else if (!user.IsActive)
        {
            return Unauthorized(new { message = "Account is disabled" });
        }

        // Generate JWT
        var token = _authService.GenerateToken(user.Phone, user.Role, user.Id);
        return Ok(new LoginResponse
        {
            Token = token,
            Phone = user.Phone,
            DisplayName = user.DisplayName,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role,
            ExpiresAt = _authService.GetTokenExpiry(token)
        });
    }

    /// <summary>
    /// Bootstrap: create admin user (only when 0 users exist)
    /// </summary>
    [HttpPost("setup")]
    public async Task<IActionResult> Setup([FromBody] SetupRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Phone))
            return BadRequest(new { message = "Phone number is required" });

        var phone = new string(request.Phone.Where(char.IsDigit).ToArray());

        using var conn = CreateConnection();
        var userCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users");

        if (userCount > 0)
            return BadRequest(new { message = "Setup already completed. Use phone login instead." });

        string? passwordHash = null;
        if (!string.IsNullOrWhiteSpace(request.Password))
            passwordHash = _authService.HashPassword(request.Password);

        var id = await conn.QuerySingleAsync<int>(
            @"INSERT INTO Users (Phone, PasswordHash, Role, IsActive, CreatedAt)
              OUTPUT INSERTED.Id
              VALUES (@Phone, @PasswordHash, 'Admin', 1, GETUTCDATE())",
            new { Phone = phone, PasswordHash = passwordHash });

        var token = _authService.GenerateToken(phone, "Admin", id);
        _logger.LogInformation("Initial admin created with phone {Phone}", phone);

        return Ok(new LoginResponse
        {
            Token = token,
            Phone = phone,
            Role = "Admin",
            ExpiresAt = _authService.GetTokenExpiry(token)
        });
    }

    /// <summary>
    /// Admin password login
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Phone and password are required" });

        var phone = new string(request.Phone.Where(char.IsDigit).ToArray());

        using var conn = CreateConnection();
        var user = await conn.QueryFirstOrDefaultAsync<User>(
            "SELECT * FROM Users WHERE Phone = @Phone", new { Phone = phone });

        if (user == null)
            return Unauthorized(new { message = "Invalid phone or password" });

        if (string.IsNullOrEmpty(user.PasswordHash))
            return Unauthorized(new { message = "Password login not enabled for this account. Use SMS verification." });

        if (!_authService.VerifyPassword(request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid phone or password" });

        if (!user.IsActive)
            return Unauthorized(new { message = "Account is disabled" });

        var token = _authService.GenerateToken(user.Phone, user.Role, user.Id);
        return Ok(new LoginResponse
        {
            Token = token,
            Phone = user.Phone,
            DisplayName = user.DisplayName,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role,
            ExpiresAt = _authService.GetTokenExpiry(token)
        });
    }

    /// <summary>
    /// Set password for admin user (one-time bootstrap, only works if no password set)
    /// </summary>
    [HttpPost("set-password")]
    public async Task<IActionResult> SetPassword([FromBody] SetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Phone and password are required" });

        var phone = new string(request.Phone.Where(char.IsDigit).ToArray());

        using var conn = CreateConnection();
        var user = await conn.QueryFirstOrDefaultAsync<User>(
            "SELECT * FROM Users WHERE Phone = @Phone AND Role = 'Admin'", new { Phone = phone });

        if (user == null)
            return NotFound(new { message = "Admin user not found" });

        if (!string.IsNullOrEmpty(user.PasswordHash))
            return BadRequest(new { message = "Password already set. Use login instead." });

        var passwordHash = _authService.HashPassword(request.Password);
        await conn.ExecuteAsync(
            "UPDATE Users SET PasswordHash = @PasswordHash WHERE Id = @Id",
            new { PasswordHash = passwordHash, user.Id });

        _logger.LogInformation("Password set for admin user {Phone}", phone);
        return Ok(new { message = "Password set successfully" });
    }

    /// <summary>
    /// Get current user profile
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        using var conn = CreateConnection();
        var user = await conn.QueryFirstOrDefaultAsync<UserDto>(
            "SELECT Id, Phone, DisplayName, FirstName, LastName, Role, IsActive, CreatedAt FROM Users WHERE Id = @Id",
            new { Id = userId });

        if (user == null) return NotFound();
        return Ok(user);
    }

    /// <summary>
    /// Update current user's profile
    /// </summary>
    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        using var conn = CreateConnection();

        var displayName = string.Join(" ", new[] { request.FirstName?.Trim(), request.LastName?.Trim() }
            .Where(s => !string.IsNullOrEmpty(s)));

        await conn.ExecuteAsync(
            @"UPDATE Users SET FirstName = @FirstName, LastName = @LastName, DisplayName = @DisplayName, UpdatedAt = GETUTCDATE() WHERE Id = @Id",
            new { request.FirstName, request.LastName, DisplayName = string.IsNullOrWhiteSpace(displayName) ? null : displayName, Id = userId });

        return Ok(new { message = "Profile updated" });
    }
}
