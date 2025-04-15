import axios from "./CustomizeAxios";
import { toast } from "react-toastify";

/**
 * Update the current user's profile information
 * @param {Object} userData - The user data to update (fullname, email, phone, address)
 * @returns {Promise} - Updated user information
 */
export async function updateUserProfile(userData) {
  try {
    console.log('Updating user profile with data:', {
      ...userData,
      password: userData.password ? '[REDACTED]' : undefined
    });
    
    const res = await axios.put("/users/profile", userData);
    
    if (res.data.success) {
      // Update user in localStorage
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const currentUser = JSON.parse(userStr);
        const updatedUser = {
          ...currentUser,
          ...userData,
          // Don't include password in localStorage
          password: undefined
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      toast.success("Thông tin cá nhân đã được cập nhật");
    } else {
      toast.error(res.data.message || "Cập nhật thông tin không thành công");
    }
    
    return res.data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      toast.error(error.response.data.message || "Cập nhật thông tin không thành công");
    } else {
      toast.error("Không thể kết nối đến máy chủ");
    }
    
    throw error;
  }
}

/**
 * Update the current user's password
 * @param {string} currentPassword - The current password
 * @param {string} newPassword - The new password
 * @returns {Promise} - Success message
 */
export async function updateUserPassword(currentPassword, newPassword) {
  try {
    const res = await axios.put("/users/password", {
      currentPassword,
      newPassword
    });
    
    if (res.data.success) {
      toast.success("Mật khẩu đã được cập nhật");
    } else {
      toast.error(res.data.message || "Cập nhật mật khẩu không thành công");
    }
    
    return res.data;
  } catch (error) {
    console.error('Error updating password:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      toast.error(error.response.data.message || "Cập nhật mật khẩu không thành công");
    } else {
      toast.error("Không thể kết nối đến máy chủ");
    }
    
    throw error;
  }
}

export default {
  updateUserProfile,
  updateUserPassword
}; 