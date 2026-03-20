-- Migration 003: Phone Scans table for saving scanned images and OCR results
-- Allows admin review of phone number scans

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('PhoneScans') AND type = 'U')
BEGIN
    CREATE TABLE PhoneScans (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ImagePath NVARCHAR(500) NOT NULL,
        ScannedData NVARCHAR(MAX) NULL,        -- JSON of the OCR results
        ScannedBy INT NULL,                     -- User ID of admin who scanned
        ScannedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        ReviewedAt DATETIME2 NULL,
        ReviewedBy INT NULL,
        Notes NVARCHAR(500) NULL
    );
    PRINT 'Created PhoneScans table';
END
