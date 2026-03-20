namespace RedPhoenix.Api.Services;

/// <summary>
/// Local disk file storage. Saves to {AppContext.BaseDirectory}/uploads/{siteKey}/{YYYY-MM}/{assetId}.{ext}
/// Uses AppContext.BaseDirectory for IIS compatibility (not Directory.GetCurrentDirectory()).
/// Pattern from funtime-shared.
/// </summary>
public class LocalFileStorageService : IFileStorageService
{
    private readonly string _basePath;
    private readonly ILogger<LocalFileStorageService> _logger;

    public string StorageType => "local";

    public LocalFileStorageService(IConfiguration configuration, ILogger<LocalFileStorageService> logger)
    {
        _logger = logger;
        _basePath = configuration["Storage:LocalPath"]
            ?? Path.Combine(AppContext.BaseDirectory, "uploads");
    }

    public async Task<string> UploadFileAsync(Stream stream, string fileName, int assetId, string? siteKey = null)
    {
        var effectiveSiteKey = string.IsNullOrWhiteSpace(siteKey) ? "usushi" : siteKey;
        var monthFolder = DateTime.UtcNow.ToString("yyyy-MM");

        var uploadsPath = Path.Combine(_basePath, effectiveSiteKey, monthFolder);
        Directory.CreateDirectory(uploadsPath);

        var extension = Path.GetExtension(fileName)?.ToLowerInvariant() ?? ".bin";
        var savedFileName = $"{assetId}{extension}";
        var filePath = Path.Combine(uploadsPath, savedFileName);

        await using (var fs = new FileStream(filePath, FileMode.Create))
        {
            await stream.CopyToAsync(fs);
        }

        var relativeUrl = $"/{effectiveSiteKey}/{monthFolder}/{savedFileName}";
        _logger.LogInformation("Stored asset {AssetId} at {Path}", assetId, relativeUrl);
        return relativeUrl;
    }

    public Task DeleteFileAsync(string storageUrl)
    {
        if (string.IsNullOrEmpty(storageUrl)) return Task.CompletedTask;

        var filePath = ResolveFilePath(storageUrl);
        if (filePath != null && File.Exists(filePath))
        {
            File.Delete(filePath);
            _logger.LogInformation("Deleted file at {Path}", storageUrl);
        }

        return Task.CompletedTask;
    }

    public Task<Stream?> GetFileStreamAsync(string storageUrl)
    {
        if (string.IsNullOrEmpty(storageUrl)) return Task.FromResult<Stream?>(null);

        var filePath = ResolveFilePath(storageUrl);
        if (filePath == null || !File.Exists(filePath)) return Task.FromResult<Stream?>(null);

        Stream stream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
        return Task.FromResult<Stream?>(stream);
    }

    public Task<bool> FileExistsAsync(string storageUrl)
    {
        if (string.IsNullOrEmpty(storageUrl)) return Task.FromResult(false);

        var filePath = ResolveFilePath(storageUrl);
        return Task.FromResult(filePath != null && File.Exists(filePath));
    }

    private string? ResolveFilePath(string storageUrl)
    {
        var relativePath = storageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        return Path.Combine(_basePath, relativePath);
    }
}
