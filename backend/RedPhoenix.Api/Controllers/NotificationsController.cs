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
public class NotificationsController : ControllerBase
{
    private readonly IConfiguration _config;

    public NotificationsController(IConfiguration config)
    {
        _config = config;
    }

    private SqlConnection CreateConnection() =>
        new(_config.GetConnectionString("DefaultConnection"));

    /// <summary>
    /// Get user's notifications
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetNotifications()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        using var conn = CreateConnection();

        var notifications = await conn.QueryAsync<Notification>(
            @"SELECT Id, UserId, Message, IsRead, CreatedAt
              FROM Notifications
              WHERE UserId = @UserId
              ORDER BY CreatedAt DESC",
            new { UserId = userId });

        return Ok(notifications);
    }

    /// <summary>
    /// Mark a notification as read
    /// </summary>
    [HttpPost("{id}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        using var conn = CreateConnection();

        await conn.ExecuteAsync(
            "UPDATE Notifications SET IsRead = 1 WHERE Id = @Id AND UserId = @UserId",
            new { Id = id, UserId = userId });

        return Ok(new { message = "Notification marked as read" });
    }

    /// <summary>
    /// Mark all notifications as read
    /// </summary>
    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        using var conn = CreateConnection();

        await conn.ExecuteAsync(
            "UPDATE Notifications SET IsRead = 1 WHERE UserId = @UserId AND IsRead = 0",
            new { UserId = userId });

        return Ok(new { message = "All notifications marked as read" });
    }
}
