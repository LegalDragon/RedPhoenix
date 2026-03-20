using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace RedPhoenix.Api.Services;

public class AuthService
{
    private readonly IConfiguration _config;

    public AuthService(IConfiguration config)
    {
        _config = config;
    }

    public string GenerateToken(string phone, string role, int userId)
    {
        var key = _config["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured");
        var issuer = _config["Jwt:Issuer"] ?? "USushi";
        var audience = _config["Jwt:Audience"] ?? "USushi";
        var expiryHours = int.TryParse(_config["Jwt:ExpiryHours"], out var h) ? h : 24;

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.Name, phone),
            new Claim(ClaimTypes.Role, role),
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiryHours),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public DateTime GetTokenExpiry(string token)
    {
        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);
        return jwtToken.ValidTo;
    }

    public string HashPassword(string password)
    {
        using var rng = RandomNumberGenerator.Create();
        var salt = new byte[16];
        rng.GetBytes(salt);

        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, 100000, HashAlgorithmName.SHA256);
        var hash = pbkdf2.GetBytes(32);

        var combined = new byte[48];
        Buffer.BlockCopy(salt, 0, combined, 0, 16);
        Buffer.BlockCopy(hash, 0, combined, 16, 32);

        return Convert.ToBase64String(combined);
    }

    public bool VerifyPassword(string password, string storedHash)
    {
        var combined = Convert.FromBase64String(storedHash);
        if (combined.Length != 48) return false;

        var salt = new byte[16];
        var storedHashBytes = new byte[32];
        Buffer.BlockCopy(combined, 0, salt, 0, 16);
        Buffer.BlockCopy(combined, 16, storedHashBytes, 0, 32);

        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, 100000, HashAlgorithmName.SHA256);
        var computedHash = pbkdf2.GetBytes(32);

        return CryptographicOperations.FixedTimeEquals(computedHash, storedHashBytes);
    }
}
