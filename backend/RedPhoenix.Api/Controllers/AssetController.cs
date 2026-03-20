using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RedPhoenix.Api.Models;
using RedPhoenix.Api.Services;

namespace RedPhoenix.Api.Controllers;

/// <summary>
/// Asset management controller following the funtime-shared pattern.
/// GET /asset/{id} is THE canonical URL for all uploaded files.
/// Never expose raw storage paths to the client.
/// </summary>
[ApiController]
[Route("[controller]")]
public class AssetController : ControllerBase
{
    private readonly IAssetService _assetService;
    private readonly IFileStorageService _storageService;
    private readonly ILogger<AssetController> _logger;

    private static readonly Dictionary<string, (string Category, int MaxSizeMB)> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ("image", 10),
        ["image/png"] = ("image", 10),
        ["image/gif"] = ("image", 10),
        ["image/webp"] = ("image", 10),
    };

    public AssetController(
        IAssetService assetService,
        IFileStorageService storageService,
        ILogger<AssetController> logger)
    {
        _assetService = assetService;
        _storageService = storageService;
        _logger = logger;
    }

    /// <summary>
    /// Upload a file via multipart form data.
    /// </summary>
    [HttpPost("upload")]
    [Authorize]
    [RequestSizeLimit(52_428_800)]
    public async Task<ActionResult<AssetUploadResponse>> Upload(
        IFormFile file,
        [FromQuery] string? assetType = null,
        [FromQuery] string? category = null,
        [FromQuery] string? siteKey = null)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });

        var contentType = file.ContentType.ToLowerInvariant();
        if (!AllowedTypes.TryGetValue(contentType, out var typeInfo))
            return BadRequest(new { message = $"File type '{contentType}' is not allowed." });

        if (file.Length > typeInfo.MaxSizeMB * 1024 * 1024)
            return BadRequest(new { message = $"File size must be less than {typeInfo.MaxSizeMB}MB." });

        var userId = GetCurrentUserId();

        var asset = new Asset
        {
            AssetType = assetType ?? typeInfo.Category,
            FileName = file.FileName,
            ContentType = contentType,
            FileSize = file.Length,
            StorageUrl = string.Empty,
            StorageType = _storageService.StorageType,
            Category = category,
            SiteKey = siteKey ?? "usushi",
            UploadedBy = userId,
            IsPublic = true
        };
        asset = await _assetService.CreateAsync(asset);

        using var stream = file.OpenReadStream();
        var storageUrl = await _storageService.UploadFileAsync(stream, file.FileName, asset.Id, asset.SiteKey);
        await _assetService.UpdateStorageUrlAsync(asset.Id, storageUrl);

        return Ok(new AssetUploadResponse
        {
            Success = true,
            AssetId = asset.Id,
            AssetType = asset.AssetType ?? "image",
            FileName = asset.FileName,
            ContentType = asset.ContentType,
            FileSize = asset.FileSize,
            Url = $"/asset/{asset.Id}"
        });
    }

    /// <summary>
    /// Upload a file via base64-encoded JSON body (Cloudflare WAF safe).
    /// </summary>
    [HttpPost("upload-base64")]
    [Authorize]
    public async Task<ActionResult<AssetUploadResponse>> UploadBase64([FromBody] Base64UploadRequest request)
    {
        if (string.IsNullOrEmpty(request.ImageData))
            return BadRequest(new { message = "No image data provided." });

        string base64Data;
        string contentType = "image/jpeg";

        if (request.ImageData.StartsWith("data:"))
        {
            var commaIdx = request.ImageData.IndexOf(',');
            if (commaIdx < 0)
                return BadRequest(new { message = "Invalid data URL format." });

            var header = request.ImageData[..commaIdx];
            base64Data = request.ImageData[(commaIdx + 1)..];

            var mimeEnd = header.IndexOf(';');
            if (mimeEnd > 5)
                contentType = header[5..mimeEnd];
        }
        else
        {
            base64Data = request.ImageData;
        }

        if (!AllowedTypes.TryGetValue(contentType, out var typeInfo))
            return BadRequest(new { message = $"File type '{contentType}' is not allowed." });

        if (base64Data.Length > typeInfo.MaxSizeMB * 1024 * 1024 * 4 / 3)
            return BadRequest(new { message = $"File too large (max {typeInfo.MaxSizeMB}MB)." });

        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(base64Data);
        }
        catch (FormatException)
        {
            return BadRequest(new { message = "Invalid base64 data." });
        }

        var extension = contentType switch
        {
            "image/png" => ".png",
            "image/gif" => ".gif",
            "image/webp" => ".webp",
            _ => ".jpg"
        };

        var fileName = request.FileName ?? $"upload{extension}";
        var userId = GetCurrentUserId();

        var asset = new Asset
        {
            AssetType = request.AssetType ?? typeInfo.Category,
            FileName = fileName,
            ContentType = contentType,
            FileSize = bytes.Length,
            StorageUrl = string.Empty,
            StorageType = _storageService.StorageType,
            Category = request.Category,
            SiteKey = request.SiteKey ?? "usushi",
            UploadedBy = userId,
            IsPublic = request.IsPublic
        };
        asset = await _assetService.CreateAsync(asset);

        using var stream = new MemoryStream(bytes);
        var storageUrl = await _storageService.UploadFileAsync(stream, fileName, asset.Id, asset.SiteKey);
        await _assetService.UpdateStorageUrlAsync(asset.Id, storageUrl);

        return Ok(new AssetUploadResponse
        {
            Success = true,
            AssetId = asset.Id,
            AssetType = asset.AssetType ?? "image",
            FileName = asset.FileName,
            ContentType = asset.ContentType,
            FileSize = asset.FileSize,
            Url = $"/asset/{asset.Id}"
        });
    }

    /// <summary>
    /// Serve an asset file by ID. This is THE canonical URL for all assets.
    /// </summary>
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAsset(int id)
    {
        var asset = await _assetService.GetByIdAsync(id);
        if (asset == null) return NotFound();

        if (!asset.IsPublic && GetCurrentUserId() == null)
            return Unauthorized();

        var stream = await _storageService.GetFileStreamAsync(asset.StorageUrl);
        if (stream == null) return NotFound();

        return File(stream, asset.ContentType, asset.FileName);
    }

    /// <summary>
    /// Delete an asset (owner or admin only).
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize]
    public async Task<ActionResult> DeleteAsset(int id)
    {
        var asset = await _assetService.GetByIdAsync(id);
        if (asset == null) return NotFound();

        var userId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Admin");

        if (asset.UploadedBy != userId && !isAdmin)
            return Forbid();

        var deleted = await _assetService.DeleteAsync(id);
        if (!deleted) return StatusCode(500, new { message = "Failed to delete asset." });

        return Ok(new { message = "Asset deleted." });
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }
}
