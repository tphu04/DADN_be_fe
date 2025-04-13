import axios from "./CustomizeAxios";
import { toast } from "react-toastify";

/**
 * Get all users (admin only)
 * @returns {Promise} - List of users
 */
export async function getAllUsers() {
  try {
    console.log('Fetching all users through /users endpoint');
    const res = await axios.get("/users");
    console.log('Response from getAllUsers:', res.data);
    
    if (!res.data.success) {
      console.error('API returned success: false -', res.data.message);
    }
    
    return res.data;
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    toast.error(error?.response?.data?.message || "Failed to fetch users");
    throw error;
  }
}

/**
 * Get all users including regular users and admins (admin only)
 * @returns {Promise} - List of all users in the system
 */
export async function getAllSystemUsers() {
  try {
    console.log('Fetching all system users through /users/all endpoint');
    const res = await axios.get("/users/all");
    console.log('Response from getAllSystemUsers:', res.data);
    
    if (!res.data.success) {
      console.error('API returned success: false -', res.data.message);
    }
    
    return res.data;
  } catch (error) {
    console.error('Error in getAllSystemUsers:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    toast.error(error?.response?.data?.message || "Failed to fetch all system users");
    throw error;
  }
}

/**
 * Update user access status
 * @param {number} userId - User ID
 * @param {boolean} isAccepted - Whether to accept or deny
 * @returns {Promise} - Updated user
 */
export async function updateUserAccess(userId, isAccepted) {
  try {
    const data = { isAccepted };
    
    console.log('Updating user access:', { userId, isAccepted });
    const res = await axios.put(`/users/${userId}/access`, data);
    console.log('User access update response:', res.data);
    return res.data;
  } catch (error) {
    console.error('Error updating user access:', error);
    toast.error(error?.response?.data?.message || "Failed to update user");
    throw error;
  }
}

/**
 * Check if current user is an admin
 * @returns {boolean} - true if admin, false otherwise
 */
export function isAdmin() {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    console.log('No user found in localStorage when checking admin status');
    return false;
  }
  
  try {
    const user = JSON.parse(userStr);
    console.log('Checking admin status for user:', user.username || 'unknown');
    
    // If any of these flags are true, consider the user an admin
    const isAdminFlag = user.isAdmin === true;
    const hasAdminRole = user.role === 'ADMIN';
    const hasAdminType = user.userType === 'admin';
    
    const adminStatus = isAdminFlag || hasAdminRole || hasAdminType;
    console.log('Admin status check results:', { 
      isAdminFlag, 
      hasAdminRole, 
      hasAdminType, 
      finalResult: adminStatus 
    });
    
    return adminStatus;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get admin profile
 * @returns {Promise} - Admin profile data
 */
export async function getAdminProfile() {
  try {
    console.log('Fetching admin profile...');
    const res = await axios.get("/admin/profile");
    console.log('Admin profile response:', res.data);
    
    if (!res.data.success) {
      console.error('API returned success:false for admin profile:', res.data.message);
      throw new Error(res.data.message || 'Failed to validate admin profile');
    }
    
    return res.data;
  } catch (error) {
    console.error('Error getting admin profile:', error);
    
    // Add detailed error logging
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', error.response.data);
      
      // If getting admin profile fails due to authentication, clear the session
      if (error.response.status === 401 || error.response.status === 403) {
        console.log('Authentication error, clearing session...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error during request setup:', error.message);
    }
    
    throw error;
  }
}

/**
 * Get all devices for admin
 * @returns {Promise} - List of all devices
 */
export async function getAllDevices() {
  try {
    console.log('Fetching all devices through /admin/devices endpoint');
    const res = await axios.get("/admin/devices");
    console.log('Response from getAllDevices:', res.data);
    
    if (!res.data.success) {
      console.error('API returned success: false -', res.data.message);
    }
    
    return res.data;
  } catch (error) {
    console.error('Error in getAllDevices:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    toast.error(error?.response?.data?.message || "Failed to fetch devices");
    throw error;
  }
}

/**
 * Create a new device
 * @param {object} deviceData - Device data including deviceCode, deviceName, deviceType, userId
 * @returns {Promise} - Created device
 */
export async function createDevice(deviceData) {
  try {
    console.log('Creating device with data:', deviceData);
    const res = await axios.post("/admin/devices", deviceData);
    console.log('Response from createDevice:', res.data);
    
    if (res.data.success) {
      toast.success("Device created successfully");
    } else {
      toast.error(res.data.message || "Failed to create device");
    }
    
    return res.data;
  } catch (error) {
    console.error('Error in createDevice:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    toast.error(error?.response?.data?.message || "Failed to create device");
    throw error;
  }
}

/**
 * Update a device
 * @param {number} deviceId - Device ID
 * @param {object} deviceData - Device data to update
 * @returns {Promise} - Updated device
 */
export async function updateDevice(deviceId, deviceData) {
  try {
    console.log(`Updating device ${deviceId} with data:`, deviceData);
    const res = await axios.put(`/admin/devices/${deviceId}`, deviceData);
    console.log('Response from updateDevice:', res.data);
    
    if (res.data.success) {
      toast.success("Device updated successfully");
    } else {
      toast.error(res.data.message || "Failed to update device");
    }
    
    return res.data;
  } catch (error) {
    console.error('Error in updateDevice:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    toast.error(error?.response?.data?.message || "Failed to update device");
    throw error;
  }
}

/**
 * Delete a device
 * @param {number} deviceId - Device ID
 * @returns {Promise} - Response with success or error
 */
export async function deleteDevice(deviceId) {
  try {
    console.log(`Deleting device ${deviceId}`);
    const res = await axios.delete(`/admin/devices/${deviceId}`);
    console.log('Response from deleteDevice:', res.data);
    
    if (res.data.success) {
      toast.success("Device deleted successfully");
    } else {
      toast.error(res.data.message || "Failed to delete device");
    }
    
    return res.data;
  } catch (error) {
    console.error('Error in deleteDevice:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    toast.error(error?.response?.data?.message || "Failed to delete device");
    throw error;
  }
}

/**
 * Create a new user (admin only)
 * @param {object} userData - User data including fullname, username, email, phone, address, password, isAccepted
 * @returns {Promise} - Created user
 */
export async function createUser(userData) {
  try {
    console.log('Creating user with data:', { ...userData, password: '[REDACTED]' });
    const res = await axios.post("/users", userData);
    console.log('Response from createUser:', res.data);
    
    if (res.data.success) {
      toast.success("User created successfully");
    } else {
      toast.error(res.data.message || "Failed to create user");
    }
    
    return res.data;
  } catch (error) {
    console.error('Error in createUser:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    toast.error(error?.response?.data?.message || "Failed to create user");
    throw error;
  }
}

/**
 * Update a user (admin only)
 * @param {number} userId - User ID
 * @param {object} userData - User data to update
 * @returns {Promise} - Updated user
 */
export async function updateUser(userId, userData) {
  try {
    console.log(`Updating user ${userId} with data:`, {
      ...userData,
      password: userData.password ? '[REDACTED]' : undefined
    });
    const res = await axios.put(`/users/${userId}`, userData);
    console.log('Response from updateUser:', res.data);
    
    if (res.data.success) {
      toast.success("User updated successfully");
    } else {
      toast.error(res.data.message || "Failed to update user");
    }
    
    return res.data;
  } catch (error) {
    console.error('Error in updateUser:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    toast.error(error?.response?.data?.message || "Failed to update user");
    throw error;
  }
}

/**
 * Delete a user (admin only)
 * @param {number} userId - User ID
 * @returns {Promise} - Deleted user
 */
export async function deleteUser(userId) {
  try {
    console.log(`Deleting user ${userId}`);
    const res = await axios.delete(`/users/${userId}`);
    console.log('Response from deleteUser:', res.data);
    
    if (res.data.success) {
      toast.success("User deleted successfully");
    } else {
      toast.error(res.data.message || "Failed to delete user");
    }
    
    return res.data;
  } catch (error) {
    console.error('Error in deleteUser:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    toast.error(error?.response?.data?.message || "Failed to delete user");
    throw error;
  }
}

/**
 * Update MQTT credentials for a user's devices
 * @param {number} userId - User ID
 * @param {string} mqttUsername - MQTT username
 * @param {string} mqttApiKey - MQTT API key
 * @returns {Promise} - Updated user with MQTT credentials
 */
export async function updateMQTTCredentials(userId, mqttUsername, mqttApiKey) {
  try {
    console.log(`Updating MQTT credentials for user ${userId}`);
    const res = await axios.put(`/admin/users/${userId}/mqtt`, {
      mqttUsername,
      mqttApiKey
    });
    console.log('Response from updateMQTTCredentials:', res.data);
    
    if (res.data.success) {
      toast.success("MQTT credentials updated successfully");
    } else {
      toast.error(res.data.message || "Failed to update MQTT credentials");
    }
    
    return res.data;
  } catch (error) {
    console.error('Error in updateMQTTCredentials:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    toast.error(error?.response?.data?.message || "Failed to update MQTT credentials");
    throw error;
  }
} 