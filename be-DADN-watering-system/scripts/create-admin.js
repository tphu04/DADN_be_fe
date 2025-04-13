// Simple script to create an admin user in the database
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('Setting up admin user...');

    // Check if any user exists
    const userCount = await prisma.user.count();
    console.log(`Found ${userCount} existing users`);

    if (userCount === 0) {
      // Create a new admin user
      console.log('Creating new admin user...');
      const adminUser = await prisma.user.create({
        data: {
          fullname: 'Admin User',
          username: 'admin',
          password: 'admin123', // In production, use a secure password
          email: 'admin@example.com',
          phone: '0123456789',
          address: 'Admin Address'
        }
      });
      console.log('Created admin user with ID:', adminUser.id);
    }

    // Run SQL queries directly on the database for columns that might not exist in the schema yet
    console.log('Running manual SQL queries to update schema and set admin role...');

    // First check if columns exist
    const checkQueries = [
      `SHOW COLUMNS FROM User LIKE 'role'`,
      `SHOW COLUMNS FROM User LIKE 'isAccepted'`,
      `SHOW COLUMNS FROM User LIKE 'mqttUsername'`,
      `SHOW COLUMNS FROM User LIKE 'mqttApiKey'`
    ];

    for (const query of checkQueries) {
      try {
        const result = await prisma.$queryRawUnsafe(query);
        console.log(`Column check: ${query}`, result.length > 0 ? 'Exists' : 'Does not exist');
      } catch (error) {
        console.error(`Error checking column: ${query}`, error.message);
      }
    }

    // Add columns if they don't exist (MySQL syntax)
    const addColumnQueries = [
      `ALTER TABLE User ADD COLUMN role VARCHAR(10) DEFAULT 'USER'`,
      `ALTER TABLE User ADD COLUMN isAccepted BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE User ADD COLUMN mqttUsername VARCHAR(255)`,
      `ALTER TABLE User ADD COLUMN mqttApiKey VARCHAR(255)`
    ];

    for (const query of addColumnQueries) {
      try {
        await prisma.$executeRawUnsafe(query);
        console.log('Successfully executed query:', query);
      } catch (error) {
        // If column already exists, MySQL will throw an error
        if (error.message.includes('Duplicate column name')) {
          console.log(`Column already exists: ${query}`);
        } else {
          console.error(`Error executing query: ${query}`, error.message);
        }
      }
    }

    // Update admin user
    try {
      const updateQuery = `UPDATE User SET role = 'ADMIN', isAccepted = TRUE, mqttUsername = 'leduccuongks0601', mqttApiKey = 'aio_SNIo23qcDoXgGUptXfEwQk73o40p' WHERE username = 'admin'`;
      await prisma.$executeRawUnsafe(updateQuery);
      console.log('Successfully updated admin user');
    } catch (error) {
      console.error('Error updating admin user:', error.message);
    }
    
    console.log('Admin setup completed!');
  } catch (error) {
    console.error('Error setting up admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createAdmin().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
}); 