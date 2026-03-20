-- Migration 002: Add IsPhoneVerified to Users table
-- Existing users are verified (they logged in via OTP), new imports will be unverified

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'IsPhoneVerified')
BEGIN
    ALTER TABLE Users ADD IsPhoneVerified BIT NOT NULL DEFAULT 1;
    PRINT 'Added IsPhoneVerified column to Users table';
END
