const prisma = require('../../config/database');

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    // Check if the user is an admin directly from the token data
    if (!req.user.isAdmin && req.user.userType !== 'admin' && req.user.role !== 'ADMIN') {
      console.log('Unauthorized access attempt to getAllUsers:', req.user);
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access. Admin privileges required.'
      });
    }

    console.log(`Admin ${req.user.id} fetching all users`);

    // Get all users WITHOUT filtering out the admin
    // We want to display all users in the database
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullname: true,
        username: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: {
          select: {
            configuration: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Retrieved ${users.length} users from database`);

    // Add default values for missing fields
    const usersWithExtendedData = users.map(user => ({
      ...user,
      role: 'USER',
      isAccepted: false,
      mqttUsername: null,
      mqttApiKey: null,
      deviceCount: user._count.configuration || 0
    }));

    return res.status(200).json({
      success: true,
      data: usersWithExtendedData
    });
  } catch (error) {
    console.error('Error getting users:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// Update user acceptance status
const updateUserAccess = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isAccepted } = req.body;

    // Check if the user is an admin directly from the token data
    if (!req.user.isAdmin && req.user.userType !== 'admin' && req.user.role !== 'ADMIN') {
      console.log('Unauthorized access attempt to updateUserAccess:', req.user);
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access. Admin privileges required.'
      });
    }

    console.log(`Admin ${req.user.id} updating access for user ${userId}: isAccepted=${isAccepted}`);

    try {
      // First check if the user exists
      const userExists = await prisma.user.findUnique({
        where: { id: Number(userId) }
      });

      if (!userExists) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if the isAccepted column exists
      let isAcceptedExists = false;
      try {
        const columnsResult = await prisma.$queryRaw`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'User' 
          AND COLUMN_NAME = 'isAccepted'
        `;
        isAcceptedExists = columnsResult.length > 0;
      } catch (error) {
        console.error('Error checking columns:', error.message);
      }

      // If column doesn't exist, add it
      if (!isAcceptedExists) {
        await prisma.$executeRawUnsafe(`ALTER TABLE User ADD COLUMN isAccepted BOOLEAN DEFAULT false`);
      }

      // Update user status
      const updatedUser = await prisma.user.update({
        where: { id: Number(userId) },
        data: { isAccepted }
      });

      return res.status(200).json({
        success: true,
        message: `User ${isAccepted ? 'approved' : 'denied'} successfully`,
        data: {
          id: updatedUser.id,
          username: updatedUser.username,
          isAccepted: updatedUser.isAccepted
        }
      });
    } catch (error) {
      console.error('Database error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Error updating user in database',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Error updating user access:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating user access',
      error: error.message
    });
  }
};

// Get current user profile
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType || 'user';
    
    console.log(`Getting profile for ${userType} with ID ${userId}`);
    
    // If the user is an admin (from Admin table)
    if (userType === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullname: true,
          username: true,
          email: true,
          phone: true,
          adminCode: true
        }
      });
      
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      // Return admin data with admin flag
      return res.status(200).json({
        success: true,
        data: {
          ...admin,
          isAdmin: true,
          userType: 'admin',
          role: 'ADMIN'
        }
      });
    }
    
    // For regular users
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullname: true,
        username: true,
        email: true,
        phone: true,
        address: true,
        createdAt: true,
        _count: {
          select: {
            configuration: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if columns exist via raw query before returning them
    let additionalFields = {};
    try {
      // Check if role column exists
      const roleCheck = await prisma.$queryRaw`SHOW COLUMNS FROM User LIKE 'role'`;
      if (roleCheck && roleCheck.length > 0) {
        const userData = await prisma.$queryRaw`SELECT role FROM User WHERE id = ${userId}`;
        if (userData && userData.length > 0) {
          additionalFields.role = userData[0].role || 'USER';
        }
      }
      
      // Check if acceptance fields exist
      const acceptedCheck = await prisma.$queryRaw`SHOW COLUMNS FROM User LIKE 'isAccepted'`;
      if (acceptedCheck && acceptedCheck.length > 0) {
        const userData = await prisma.$queryRaw`SELECT isAccepted FROM User WHERE id = ${userId}`;
        if (userData && userData.length > 0) {
          additionalFields.isAccepted = userData[0].isAccepted || false;
        }
      }
    } catch (error) {
      console.log('Error checking additional fields:', error.message);
      // Continue without these fields if there's an error
    }

    return res.status(200).json({
      success: true,
      data: {
        ...user,
        ...additionalFields,
        isAdmin: false,
        userType: 'user'
      }
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: error.message
    });
  }
};

// Get all users from both User and Admin tables
const getAllSystemUsers = async (req, res) => {
  try {
    // Check if the user is an admin directly from the token data
    if (!req.user.isAdmin && req.user.userType !== 'admin' && req.user.role !== 'ADMIN') {
      console.log('Unauthorized access attempt to getAllSystemUsers:', req.user);
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access. Admin privileges required.'
      });
    }

    console.log(`Admin ${req.user.id} fetching all system users (both User and Admin tables)`);

    // Get users from User table with all required fields
    const regularUsers = await prisma.user.findMany({
      select: {
        id: true,
        fullname: true,
        username: true,
        email: true,
        phone: true,
        address: true,
        createdAt: true,
        isAccepted: true,
        _count: {
          select: {
            configuration: true
          }
        }
      }
    });

    // Get users from Admin table
    const adminUsers = await prisma.admin.findMany({
      select: {
        id: true,
        fullname: true,
        username: true,
        email: true,
        phone: true
      }
    });

    // Transform admin users to match regular user format
    const formattedAdminUsers = adminUsers.map(admin => ({
      ...admin,
      role: 'ADMIN',
      isAdmin: true,
      userType: 'admin',
      address: 'Admin Address',
      createdAt: new Date().toISOString(),
      _count: { configuration: 0 },
      isAccepted: true
    }));

    // Combine both user types
    const allUsers = [...regularUsers, ...formattedAdminUsers];

    console.log(`Retrieved ${regularUsers.length} regular users and ${adminUsers.length} admin users`);

    return res.status(200).json({
      success: true,
      data: allUsers
    });
  } catch (error) {
    console.error('Error getting all system users:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching system users',
      error: error.message
    });
  }
};

// Create a new user (admin only)
const createUser = async (req, res) => {
  try {
    // Check if the requester is an admin
    if (!req.user.isAdmin && req.user.userType !== 'admin' && req.user.role !== 'ADMIN') {
      console.log('Unauthorized access attempt to createUser:', req.user);
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access. Admin privileges required.'
      });
    }

    const { fullname, username, email, phone, address, password, isAccepted } = req.body;

    // Validate required fields
    if (!fullname || !username || !email || !phone || !address || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: fullname, username, email, phone, address, password'
      });
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        fullname,
        username,
        email,
        phone,
        address,
        password, // In a real application, remember to hash the password
        isAccepted: isAccepted === true, // Default to false if not provided
        role: 'USER'
      }
    });

    console.log(`Admin ${req.user.id} created new user: ${newUser.id}`);

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: newUser.id,
        fullname: newUser.fullname,
        username: newUser.username,
        email: newUser.email,
        phone: newUser.phone,
        address: newUser.address,
        isAccepted: newUser.isAccepted,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
};

// Update a user's information (admin only)
const updateUser = async (req, res) => {
  try {
    // Check if the requester is an admin
    if (!req.user.isAdmin && req.user.userType !== 'admin' && req.user.role !== 'ADMIN') {
      console.log('Unauthorized access attempt to updateUser:', req.user);
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access. Admin privileges required.'
      });
    }

    const { userId } = req.params;
    const { fullname, username, email, phone, address, password, isAccepted, role } = req.body;

    // Ensure the user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: Number(userId) }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if new username is unique if provided
    if (username && username !== existingUser.username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username }
      });

      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
    }

    // Check if new email is unique if provided
    if (email && email !== existingUser.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email }
      });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Prepare data for update
    const updateData = {};
    if (fullname) updateData.fullname = fullname;
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (password) updateData.password = password; // Remember to hash in a real app
    if (isAccepted !== undefined) updateData.isAccepted = isAccepted;
    if (role) updateData.role = role;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: Number(userId) },
      data: updateData
    });

    console.log(`Admin ${req.user.id} updated user: ${updatedUser.id}`);

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: updatedUser.id,
        fullname: updatedUser.fullname,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        isAccepted: updatedUser.isAccepted,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
};

// Delete a user (admin only)
const deleteUser = async (req, res) => {
  try {
    // Check if the requester is an admin
    if (!req.user.isAdmin && req.user.userType !== 'admin' && req.user.role !== 'ADMIN') {
      console.log('Unauthorized access attempt to deleteUser:', req.user);
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access. Admin privileges required.'
      });
    }

    const { userId } = req.params;

    // Ensure the user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: Number(userId) }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if there are any associated configurations
    const userConfigurations = await prisma.configuration.count({
      where: { userId: Number(userId) }
    });

    if (userConfigurations > 0) {
      // Delete associated configurations first
      await prisma.configuration.deleteMany({
        where: { userId: Number(userId) }
      });
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: Number(userId) }
    });

    console.log(`Admin ${req.user.id} deleted user: ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  updateUserAccess,
  getCurrentUser,
  getAllSystemUsers,
  createUser,
  updateUser,
  deleteUser
};
