-- Add new columns to User table
ALTER TABLE User ADD COLUMN IF NOT EXISTS role VARCHAR(10) DEFAULT 'USER';
ALTER TABLE User ADD COLUMN IF NOT EXISTS isAccepted BOOLEAN DEFAULT FALSE;
ALTER TABLE User ADD COLUMN IF NOT EXISTS mqttUsername VARCHAR(255);
ALTER TABLE User ADD COLUMN IF NOT EXISTS mqttApiKey VARCHAR(255);

-- Check if admin user exists
SET @adminExists = (SELECT COUNT(*) FROM User WHERE username = 'admin');

-- Create admin user if it doesn't exist
INSERT INTO User (fullname, username, password, email, phone, address, role, isAccepted, mqttUsername, mqttApiKey, createdAt)
SELECT 'Admin User', 'admin', 'admin123', 'admin@example.com', '0123456789', 'Admin Address', 'ADMIN', TRUE, 'leduccuongks0601', 'aio_SNIo23qcDoXgGUptXfEwQk73o40p', NOW()
WHERE @adminExists = 0;

-- Update user to admin if it already exists
UPDATE User 
SET role = 'ADMIN', 
    isAccepted = TRUE,
    mqttUsername = 'leduccuongks0601',
    mqttApiKey = 'aio_SNIo23qcDoXgGUptXfEwQk73o40p'
WHERE username = 'admin' AND @adminExists > 0; 