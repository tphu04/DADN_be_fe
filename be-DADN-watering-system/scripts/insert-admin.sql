-- Script to insert an admin user into the Admin table
-- Check if the admin with this username already exists
SET @adminExists = (SELECT COUNT(*) FROM Admin WHERE username = 'admin');

-- Insert admin only if it doesn't exist
INSERT INTO Admin (fullname, phone, email, adminCode, username, password)
SELECT 'Admin User', '0123456789', 'admin@example.com', 'ADMIN001', 'admin', 'admin123'
WHERE @adminExists = 0;

-- Confirm the insertion
SELECT * FROM Admin WHERE username = 'admin'; 