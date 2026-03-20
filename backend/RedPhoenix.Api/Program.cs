using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.SqlClient;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using RedPhoenix.Api.Services;
using Dapper;

var builder = WebApplication.CreateBuilder(args);

// Configure max request body size (50MB for image uploads)
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 52_428_800; // 50MB
});
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 52_428_800; // 50MB
});

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "USushi API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "USushi";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "USushi";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

// CORS
var corsOrigins = builder.Configuration["Cors:Origins"]?.Split(',', StringSplitOptions.RemoveEmptyEntries) ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// HttpClient for external API calls
builder.Services.AddHttpClient("SmsGateway");
builder.Services.AddHttpClient("OpenAI");

// Register services
builder.Services.AddSingleton<AuthService>();
builder.Services.AddSingleton<SmsService>();
builder.Services.AddSingleton<ReceiptService>();

// Asset management services (funtime-shared pattern)
builder.Services.AddSingleton<IFileStorageService, LocalFileStorageService>();
builder.Services.AddSingleton<IAssetService, AssetService>();

var app = builder.Build();

// Auto-migration: create all tables
using (var scope = app.Services.CreateScope())
{
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var connStr = config.GetConnectionString("DefaultConnection");
    if (!string.IsNullOrEmpty(connStr))
    {
        try
        {
            using var conn = new SqlConnection(connStr);
            await conn.OpenAsync();
            await conn.ExecuteAsync(@"
                -- Users table (phone-based auth)
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
                BEGIN
                    CREATE TABLE Users (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        Phone NVARCHAR(20) NOT NULL,
                        DisplayName NVARCHAR(100) NULL,
                        Role NVARCHAR(50) NOT NULL DEFAULT 'User',
                        IsActive BIT NOT NULL DEFAULT 1,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        UpdatedAt DATETIME2 NULL
                    );
                    CREATE UNIQUE INDEX IX_Users_Phone ON Users(Phone);
                END

                -- OTP codes table
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OtpCodes')
                BEGIN
                    CREATE TABLE OtpCodes (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        Phone NVARCHAR(20) NOT NULL,
                        Code NVARCHAR(10) NOT NULL,
                        ExpiresAt DATETIME2 NOT NULL,
                        Attempts INT NOT NULL DEFAULT 0,
                        IsUsed BIT NOT NULL DEFAULT 0,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                    );
                    CREATE INDEX IX_OtpCodes_Phone ON OtpCodes(Phone);
                END

                -- Meals (receipt records)
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Meals')
                BEGIN
                    CREATE TABLE Meals (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        UserId INT NOT NULL,
                        PhotoPath NVARCHAR(500) NULL,
                        ExtractedTotal DECIMAL(10,2) NULL,
                        ExtractedDate NVARCHAR(50) NULL,
                        ExtractedRestaurant NVARCHAR(200) NULL,
                        ManualTotal DECIMAL(10,2) NULL,
                        Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        CONSTRAINT FK_Meals_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
                    );
                    CREATE INDEX IX_Meals_UserId ON Meals(UserId);
                END

                -- Rewards
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Rewards')
                BEGIN
                    CREATE TABLE Rewards (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        UserId INT NOT NULL,
                        Type NVARCHAR(50) NOT NULL DEFAULT 'FreeMeal',
                        Status NVARCHAR(20) NOT NULL DEFAULT 'Earned',
                        EarnedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        RedeemedAt DATETIME2 NULL,
                        PeriodStart DATETIME2 NOT NULL,
                        PeriodEnd DATETIME2 NOT NULL,
                        CONSTRAINT FK_Rewards_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
                    );
                    CREATE INDEX IX_Rewards_UserId ON Rewards(UserId);
                END

                -- SMS Broadcasts
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SmsBroadcasts')
                BEGIN
                    CREATE TABLE SmsBroadcasts (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        AdminUserId INT NOT NULL,
                        Message NVARCHAR(500) NOT NULL,
                        RecipientCount INT NOT NULL DEFAULT 0,
                        SentAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        CONSTRAINT FK_SmsBroadcasts_Users FOREIGN KEY (AdminUserId) REFERENCES Users(Id)
                    );
                END

                -- Notifications
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notifications')
                BEGIN
                    CREATE TABLE Notifications (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        UserId INT NOT NULL,
                        Message NVARCHAR(1000) NOT NULL,
                        IsRead BIT NOT NULL DEFAULT 0,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        CONSTRAINT FK_Notifications_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
                    );
                    CREATE INDEX IX_Notifications_UserId ON Notifications(UserId);
                END
            ");
            // Add FirstName/LastName columns if missing
            await conn.ExecuteAsync(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'FirstName')
                    ALTER TABLE Users ADD FirstName NVARCHAR(100) NULL;
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'LastName')
                    ALTER TABLE Users ADD LastName NVARCHAR(100) NULL;
            ");

            // Migration 002: Add IsPhoneVerified column
            await conn.ExecuteAsync(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'IsPhoneVerified')
                    ALTER TABLE Users ADD IsPhoneVerified BIT NOT NULL DEFAULT 1;
            ");

            // Migration 003: Assets table
            await conn.ExecuteAsync(@"
                IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('dbo.Assets') AND type = 'U')
                BEGIN
                    CREATE TABLE dbo.Assets (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        SiteKey NVARCHAR(50) NOT NULL DEFAULT 'usushi',
                        FileName NVARCHAR(500) NOT NULL,
                        ContentType NVARCHAR(100) NOT NULL,
                        FileSize BIGINT NULL,
                        StorageUrl NVARCHAR(1000) NOT NULL,
                        StorageType NVARCHAR(50) NOT NULL DEFAULT 'local',
                        AssetType NVARCHAR(50) NULL,
                        Category NVARCHAR(100) NULL,
                        UploadedBy INT NULL,
                        IsPublic BIT NOT NULL DEFAULT 1,
                        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                        IsDeleted BIT NOT NULL DEFAULT 0
                    );
                END
            ");

            // Migration 004: PhoneScans table (new installs get ImageAssetId from the start)
            await conn.ExecuteAsync(@"
                IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('dbo.PhoneScans') AND type = 'U')
                BEGIN
                    CREATE TABLE dbo.PhoneScans (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        ImageAssetId INT NULL,
                        ScannedData NVARCHAR(MAX) NULL,
                        ScannedBy INT NULL,
                        ScannedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                        ReviewedAt DATETIME2 NULL,
                        ReviewedBy INT NULL,
                        Notes NVARCHAR(500) NULL,
                        CONSTRAINT FK_PhoneScans_Assets FOREIGN KEY (ImageAssetId) REFERENCES Assets(Id)
                    );
                END
                -- Existing installs: add ImageAssetId if PhoneScans was created with ImagePath
                IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('dbo.PhoneScans') AND type = 'U')
                   AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PhoneScans') AND name = 'ImageAssetId')
                    ALTER TABLE PhoneScans ADD ImageAssetId INT NULL;
            ");

            // Migration 005: Add ReceiptAssetId to Meals
            await conn.ExecuteAsync(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Meals') AND name = 'ReceiptAssetId')
                    ALTER TABLE Meals ADD ReceiptAssetId INT NULL;
            ");

            app.Logger.LogInformation("Database migration completed successfully");
        }
        catch (Exception ex)
        {
            app.Logger.LogWarning(ex, "Database migration failed - will retry on first request");
        }
    }
}

// Middleware pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// NOTE: No UseStaticFiles() for uploads — all uploaded files served via /asset/{id} endpoint
// (funtime-shared asset management pattern)

app.MapControllers();

app.Run();
