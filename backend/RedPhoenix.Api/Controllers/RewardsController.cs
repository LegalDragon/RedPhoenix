using System.Security.Claims;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using RedPhoenix.Api.Models;

namespace RedPhoenix.Api.Controllers;

[ApiController]
[Route("[controller]")]
[Authorize]
public class RewardsController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly ILogger<RewardsController> _logger;

    public RewardsController(IConfiguration config, ILogger<RewardsController> logger)
    {
        _config = config;
        _logger = logger;
    }

    private SqlConnection CreateConnection() =>
        new(_config.GetConnectionString("DefaultConnection"));

    /// <summary>
    /// Get current user's rewards
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetMyRewards()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        using var conn = CreateConnection();

        var rewards = await conn.QueryAsync<RewardDto>(
            @"SELECT r.Id, r.UserId, r.Type, r.Status, r.EarnedAt, r.RedeemedAt, r.PeriodStart, r.PeriodEnd
              FROM Rewards r
              WHERE r.UserId = @UserId
              ORDER BY r.EarnedAt DESC",
            new { UserId = userId });

        return Ok(rewards);
    }

    /// <summary>
    /// Get all rewards (admin)
    /// </summary>
    [HttpGet("all")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllRewards([FromQuery] string? status = null)
    {
        using var conn = CreateConnection();

        var sql = @"SELECT r.Id, r.UserId, u.Phone, u.DisplayName, r.Type, r.Status, r.EarnedAt, r.RedeemedAt, r.PeriodStart, r.PeriodEnd
                    FROM Rewards r
                    INNER JOIN Users u ON u.Id = r.UserId";

        if (!string.IsNullOrEmpty(status))
            sql += " WHERE r.Status = @Status";

        sql += " ORDER BY r.EarnedAt DESC";

        var rewards = await conn.QueryAsync<RewardDto>(sql, new { Status = status });
        return Ok(rewards);
    }

    /// <summary>
    /// Redeem a reward (admin)
    /// </summary>
    [HttpPost("{id}/redeem")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RedeemReward(int id)
    {
        using var conn = CreateConnection();

        var reward = await conn.QueryFirstOrDefaultAsync<Reward>(
            "SELECT * FROM Rewards WHERE Id = @Id", new { Id = id });

        if (reward == null)
            return NotFound(new { message = "Reward not found" });

        if (reward.Status != "Earned")
            return BadRequest(new { message = $"Reward cannot be redeemed (current status: {reward.Status})" });

        await conn.ExecuteAsync(
            @"UPDATE Rewards SET Status = 'Redeemed', RedeemedAt = GETUTCDATE() WHERE Id = @Id",
            new { Id = id });

        // Create notification for user
        await conn.ExecuteAsync(
            @"INSERT INTO Notifications (UserId, Message, IsRead, CreatedAt)
              VALUES (@UserId, @Message, 0, GETUTCDATE())",
            new
            {
                reward.UserId,
                Message = "🍣 Your free meal reward has been redeemed! Enjoy your meal!"
            });

        _logger.LogInformation("Reward {RewardId} redeemed for user {UserId}", id, reward.UserId);
        return Ok(new { message = "Reward redeemed successfully" });
    }
}
