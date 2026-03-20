namespace RedPhoenix.Api.Models;

// ─── Database entities ───

public class User
{
    public int Id { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string? PasswordHash { get; set; }
    public string? DisplayName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string Role { get; set; } = "User";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class OtpCode
{
    public int Id { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public int Attempts { get; set; }
    public bool IsUsed { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class Meal
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string? PhotoPath { get; set; }
    public decimal? ExtractedTotal { get; set; }
    public string? ExtractedDate { get; set; }
    public string? ExtractedRestaurant { get; set; }
    public decimal? ManualTotal { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, Verified, Rejected
    public DateTime CreatedAt { get; set; }
}

public class Reward
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Type { get; set; } = "FreeMeal";
    public string Status { get; set; } = "Earned"; // Earned, Redeemed, Expired
    public DateTime EarnedAt { get; set; }
    public DateTime? RedeemedAt { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
}

public class SmsBroadcast
{
    public int Id { get; set; }
    public int AdminUserId { get; set; }
    public string Message { get; set; } = string.Empty;
    public int RecipientCount { get; set; }
    public DateTime SentAt { get; set; }
}

public class Notification
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

// ─── Request / Response DTOs ───

public class SendOtpRequest
{
    public string Phone { get; set; } = string.Empty;
}

public class VerifyOtpRequest
{
    public string Phone { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string Role { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

public class UserDto
{
    public int Id { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UserWithStats
{
    public int Id { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public bool IsPhoneVerified { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public int MealCount { get; set; }
    public DateTime? LastMealAt { get; set; }
}

public class UpdateProfileRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}

public class UpdateUserRequest
{
    public string? DisplayName { get; set; }
    public string? Role { get; set; }
    public bool? IsActive { get; set; }
}

public class UploadReceiptResponse
{
    public int MealId { get; set; }
    public decimal? ExtractedTotal { get; set; }
    public string? ExtractedDate { get; set; }
    public string? ExtractedRestaurant { get; set; }
    public bool NeedsManualEntry { get; set; }
}

public class ConfirmMealRequest
{
    public decimal? ManualTotal { get; set; }
}

public class MealDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string? PhotoPath { get; set; }
    public int? ReceiptAssetId { get; set; }
    public decimal? ExtractedTotal { get; set; }
    public string? ExtractedDate { get; set; }
    public string? ExtractedRestaurant { get; set; }
    public decimal? ManualTotal { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class RewardDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string? Phone { get; set; }
    public string? DisplayName { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime EarnedAt { get; set; }
    public DateTime? RedeemedAt { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
}

public class DashboardProgress
{
    public int MealsInPeriod { get; set; }
    public int MealsRequired { get; set; } = 10;
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public List<MealDto> RecentMeals { get; set; } = new();
    public List<RewardDto> ActiveRewards { get; set; } = new();
    public List<Notification> Notifications { get; set; } = new();
}

public class AdminDashboardStats
{
    public int TotalUsers { get; set; }
    public int MealsToday { get; set; }
    public int ActiveRewards { get; set; }
    public int PendingRewards { get; set; }
    public List<MealDto> RecentMeals { get; set; } = new();
}

public class SmsBroadcastRequest
{
    public string Message { get; set; } = string.Empty;
    public bool ActiveOnly { get; set; } = false;
}

public class SmsBroadcastDto
{
    public int Id { get; set; }
    public int AdminUserId { get; set; }
    public string Message { get; set; } = string.Empty;
    public int RecipientCount { get; set; }
    public DateTime SentAt { get; set; }
}

public class SetupRequest
{
    public string Phone { get; set; } = string.Empty;
    public string? Password { get; set; }
}

public class LoginRequest
{
    public string Phone { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class SetPasswordRequest
{
    public string Phone { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

// ─── Phone Scanning DTOs ───

public class PhoneScanRequest
{
    public string ImageData { get; set; } = string.Empty; // base64 or data URL
}

public class ScannedPhone
{
    public string Phone { get; set; } = string.Empty;
    public string? Name { get; set; }
    public bool AlreadyExists { get; set; }
    public bool Uncertain { get; set; }
}

public class ScanPhonesResponse
{
    public int? ScanId { get; set; }
    public List<ScannedPhone> Phones { get; set; } = new();
}

public class ImportPhonesRequest
{
    public List<string> Phones { get; set; } = new();
}

public class ImportPhonesResponse
{
    public int ImportedCount { get; set; }
    public int SkippedCount { get; set; }
    public List<string> ImportedPhones { get; set; } = new();
}

public class TestSmsRequest
{
    public string Message { get; set; } = string.Empty;
}

// ─── Phone Scan Review DTOs ───

public class PhoneScan
{
    public int Id { get; set; }
    public int? ImageAssetId { get; set; }
    public string? ScannedData { get; set; }
    public int? ScannedBy { get; set; }
    public DateTime ScannedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public int? ReviewedBy { get; set; }
    public string? Notes { get; set; }
}

public class PhoneScanDto
{
    public int Id { get; set; }
    public int? ImageAssetId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string? ScannedData { get; set; }
    public int? ScannedBy { get; set; }
    public DateTime ScannedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public int? ReviewedBy { get; set; }
    public string? Notes { get; set; }
}

public class ReviewPhoneScanRequest
{
    public string? Notes { get; set; }
}
