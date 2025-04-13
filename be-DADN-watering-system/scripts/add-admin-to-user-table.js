// Script to add the admin user to the User table for authentication
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addAdminToUserTable() {
  try {
    console.log('Adding admin to User table...');

    // Check if admin already exists in User table
    // const existingUser = await prisma.user.findFirst({
    //   where: {
    //     username: 'admin'
    //   }
    // });

    // if (existingUser) {
    //   console.log('Admin already exists in User table:', existingUser);
    //   return existingUser;
    // }

    // Get admin details from Admin table if available
    // const adminFromAdminTable = await prisma.admin.findFirst({
    //   where: {
    //     username: 'admin'
    //   }
    // });

    // Create admin in User table
    const adminData = {
      fullname: 'Admin User',
      username: 'admin',
      password: 'admin123',
      email: 'admin@example.com',
      phone: '0123456789',
      adminCode: 'admin123'
    };

    const admin = await prisma.admin.create({
      data: adminData
    });

    console.log('Admin added to User table successfully:', admin);

    // Add role column to User table if not already added
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE User ADD COLUMN IF NOT EXISTS role VARCHAR(10) DEFAULT 'USER'`);
    } catch (err) {
      // Check if column already exists error
      if (!err.message.includes('Duplicate column')) {
        console.log('Cannot add role column:', err.message);
      }
    }

    // Set admin role with direct SQL (more reliable if schema is not fully updated)
    try {
      await prisma.$executeRawUnsafe(`UPDATE User SET role = 'ADMIN' WHERE username = 'admin'`);
      console.log('Admin role set successfully');
    } catch (err) {
      console.log('Failed to set admin role:', err.message);
    }

    return admin;
  } catch (error) {
    console.error('Error adding admin to User table:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  addAdminToUserTable()
    .then(() => console.log('Admin creation in User table completed!'))
    .catch(error => console.error('Admin creation in User table failed:', error));
}

module.exports = { addAdminToUserTable }; 