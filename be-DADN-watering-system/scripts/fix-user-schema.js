const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSchema() {
  console.log('Starting database schema fix...');
  
  try {
    // Check if columns exist
    console.log('Checking if columns exist...');
    
    const columns = await prisma.$queryRaw`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'User' 
      AND COLUMN_NAME IN ('isAccepted', 'mqttUsername', 'mqttApiKey', 'role')
    `;
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    console.log('Existing columns:', existingColumns);
    
    // Add missing columns
    if (!existingColumns.includes('role')) {
      console.log('Adding role column...');
      await prisma.$executeRawUnsafe('ALTER TABLE User ADD COLUMN role VARCHAR(10) DEFAULT "USER"');
    }
    
    if (!existingColumns.includes('isAccepted')) {
      console.log('Adding isAccepted column...');
      await prisma.$executeRawUnsafe('ALTER TABLE User ADD COLUMN isAccepted BOOLEAN DEFAULT FALSE');
    }
    
    if (!existingColumns.includes('mqttUsername')) {
      console.log('Adding mqttUsername column...');
      await prisma.$executeRawUnsafe('ALTER TABLE User ADD COLUMN mqttUsername VARCHAR(255)');
    }
    
    if (!existingColumns.includes('mqttApiKey')) {
      console.log('Adding mqttApiKey column...');
      await prisma.$executeRawUnsafe('ALTER TABLE User ADD COLUMN mqttApiKey VARCHAR(255)');
    }
    
    console.log('Database schema fix completed successfully!');
  } catch (error) {
    console.error('Error fixing schema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSchema(); 