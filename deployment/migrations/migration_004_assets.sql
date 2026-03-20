-- Migration 004: Asset management system
-- Pattern from funtime-shared: files named by asset ID, served via /asset/{id} endpoint
-- This replaces raw file path storage (wwwroot/uploads/) with centralized asset management

-- 1. Assets table
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
        AssetType NVARCHAR(50) NULL,        -- 'phone-scan', 'receipt', etc.
        Category NVARCHAR(100) NULL,
        UploadedBy INT NULL,
        IsPublic BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    PRINT 'Created Assets table';
END

-- 2. PhoneScans: add ImageAssetId for existing tables (new installs get it in the CREATE TABLE)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('dbo.PhoneScans') AND type = 'U')
   AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PhoneScans') AND name = 'ImageAssetId')
    ALTER TABLE PhoneScans ADD ImageAssetId INT NULL;

-- 3. Meals: add ReceiptAssetId
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Meals') AND name = 'ReceiptAssetId')
    ALTER TABLE Meals ADD ReceiptAssetId INT NULL;
