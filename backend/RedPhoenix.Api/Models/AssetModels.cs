namespace RedPhoenix.Api.Models;

/// <summary>
/// Represents an uploaded asset. Pattern from funtime-shared:
/// files named by asset ID, served via /asset/{id} controller endpoint.
/// </summary>
public class Asset
{
    public int Id { get; set; }
    public string SiteKey { get; set; } = "usushi";
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string StorageUrl { get; set; } = string.Empty;
    public string StorageType { get; set; } = "local";
    public string? AssetType { get; set; }
    public string? Category { get; set; }
    public int? UploadedBy { get; set; }
    public bool IsPublic { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; }
}

// ── DTOs ──

public class AssetUploadResponse
{
    public bool Success { get; set; }
    public int AssetId { get; set; }
    public string AssetType { get; set; } = "image";
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string Url { get; set; } = string.Empty;
}

public class Base64UploadRequest
{
    public string ImageData { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public string? AssetType { get; set; }
    public string? Category { get; set; }
    public string? SiteKey { get; set; }
    public bool IsPublic { get; set; } = true;
}
