// Script to insert an admin into the Admin table
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function insertAdmin() {
  try {
    console.log('Inserting admin into the Admin table...');

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findFirst({
      where: {
        username: 'admin'
      }
    });

    if (existingAdmin) {
      console.log('Admin already exists:', existingAdmin);
      return existingAdmin;
    }

    // Create new admin
    const admin = await prisma.admin.create({
      data: {
        fullname: 'Admin User',
        phone: '0123456789',
        email: 'admin@example.com',
        adminCode: 'ADMIN001',
        username: 'admin',
        password: 'admin123'  // In production, use a secure password
      }
    });

    console.log('Admin inserted successfully:', admin);
    return admin;
  } catch (error) {
    console.error('Error inserting admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  insertAdmin()
    .then(() => console.log('Admin insertion completed!'))
    .catch(error => console.error('Admin insertion failed:', error));
}

module.exports = { insertAdmin }; 