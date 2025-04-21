import axios from "./CustomizeAxios";
import { toast } from "react-toastify";

/**
 * Đăng nhập vào hệ thống
 * @param {string} username - Tên đăng nhập
 * @param {string} password - Mật khẩu
 * @returns {Promise} - Kết quả đăng nhập
 */
export async function login(username, password) {
  try {
    console.log('Attempting login for user:', username);
    
    const res = await axios.post("/auth/login", {
      username,
      password,
    });

    if (res.data.success) {
      // Extra debug logging for user data
      console.log('Raw user data from login API:', res.data.data.user);
      
      // Fix isAccepted property to be a proper boolean
      const userData = res.data.data.user;
      if (userData) {
        // Ensure isAccepted is a proper boolean
        if (userData.isAccepted === 1 || userData.isAccepted === "1" || userData.isAccepted === true) {
          userData.isAccepted = true;
        } else if (userData.isAccepted === 0 || userData.isAccepted === "0" || userData.isAccepted === false || userData.isAccepted === null || userData.isAccepted === undefined) {
          userData.isAccepted = false;
        }
        
        console.log('User data after fixing isAccepted:', userData);
      }
      
      // Lưu token vào localStorage nếu đăng nhập thành công
      localStorage.setItem("token", res.data.data.token);
      // Lưu thông tin người dùng
      localStorage.setItem("user", JSON.stringify(userData || res.data.data.user));
      console.log('Login successful');
    }

    return res.data;
  } catch (error) {
    console.error('Login error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: error.code
    });
    
    let errorMessage = "Đăng nhập không thành công";
    
    if (error.code === 'ERR_NETWORK') {
      errorMessage = "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet của bạn hoặc thử lại sau.";
    } else if (error?.response?.data?.message) {
      errorMessage = error.response.data.message;
    }
    
    toast.error(errorMessage);
    throw error;
  }
}

/**
 * Đăng xuất khỏi hệ thống
 * @returns {Promise} - Kết quả đăng xuất
 */
export async function logout() {
  try {
    const res = await axios.post("/auth/logout");
    
    // Luôn xóa token và thông tin người dùng khỏi localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    
    return res.data;
  } catch (error) {
    toast.error(error?.response?.data?.message || "Đăng xuất không thành công");
    
    // Vẫn xóa dữ liệu local ngay cả khi API gọi thất bại
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    
    throw error;
  }
}

/**
 * Đăng ký tài khoản mới
 * @param {string} username - Tên đăng nhập
 * @param {string} password - Mật khẩu (không cần mã hóa, backend đã xử lý)
 * @param {string} email - Email
 * @param {string} phone - Số điện thoại
 * @param {string} fullname - Họ tên
 * @param {string} address - Địa chỉ (tùy chọn)
 * @returns {Promise} - Kết quả đăng ký
 */
export async function register(username, password, email, phone, fullname, address = "") {
  try {
    const res = await axios.post("/auth/register", {
      username,
      password,
      email,
      phone,
      fullname,
      address
    });

    return res.data;
  } catch (error) {
    toast.error(error?.response?.data?.message || "Đăng ký không thành công");
    throw error;
  }
}

/**
 * Lấy thông tin người dùng
 * @returns {Promise} - Thông tin người dùng
 */
export async function getUserProfile() {
  try {
    const res = await axios.get("/users/profile");
    
    // Debug raw response
    console.log('Raw user profile data:', res.data);
    
    if (res.data.success && res.data.data) {
      // Fix isAccepted property to be a proper boolean
      const userData = res.data.data;
      
      // Ensure isAccepted is a proper boolean
      if (userData.isAccepted === 1 || userData.isAccepted === "1" || userData.isAccepted === true) {
        userData.isAccepted = true;
      } else if (userData.isAccepted === 0 || userData.isAccepted === "0" || userData.isAccepted === false || userData.isAccepted === null || userData.isAccepted === undefined) {
        userData.isAccepted = false;
      }
      
      console.log('User profile after fixing isAccepted:', userData);
      
      // Update localStorage with corrected user data
      localStorage.setItem("user", JSON.stringify(userData));
      
      // Return modified data
      return {
        ...res.data,
        data: userData
      };
    }
    
    return res.data;
  } catch (error) {
    toast.error(error?.response?.data?.message || "Không thể lấy thông tin người dùng");
    throw error;
  }
}

/**
 * Kiểm tra xem người dùng đã đăng nhập hay chưa
 * @returns {boolean} - true nếu đã đăng nhập, false nếu chưa
 */
export function isAuthenticated() {
  const token = localStorage.getItem('token');
  const user = getUser();
  return token !== null && user !== null;
}

/**
 * Lấy thông tin người dùng từ localStorage
 * @returns {Object|null} - Thông tin người dùng hoặc null nếu không có
 */
export function getUser() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    const user = JSON.parse(userStr);
    // Ensure admin users have the correct flags set
    if (user.isAdmin || user.role === 'ADMIN' || user.userType === 'admin') {
      user.isAdmin = true;
      user.role = 'ADMIN';
      user.userType = 'admin';
    }
    
    // Ensure isAccepted is properly typed as boolean
    if (user.isAccepted === 1 || user.isAccepted === "1" || user.isAccepted === true) {
      user.isAccepted = true;
    } else if (user.isAccepted === 0 || user.isAccepted === "0" || user.isAccepted === false) {
      user.isAccepted = false;
    }
    
    console.log('User data from localStorage:', user);
    return user;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}

export async function forgotPassword(email) {
  try {
    const res = await axios.post("/auth/forgot-password", {
      email,
    });

    return res;
  } catch (error) {
    toast.error(error?.response?.data?.message);
  }
}

export async function verifyOTP(email, otp) {
  try {
    const res = await axios.post("/auth/verify-otp", {
      email,
      otp,
    });

    return res;
  } catch (error) {
    toast.error(error?.response?.data?.message);
  }
}

export async function resetPassword(email, newPassword, confirmPassword) {
  try {
    const res = await axios.post("/auth/reset-password", {
      email,
      newPassword,
      confirmPassword,
    });

    return res;
  } catch (error) {
    toast.error(error?.response?.data?.message);
  }
}

// export async function getInfo(token) {
//   try {
//     const res = await axios.get("/", {
//       token,
//     });
//     return res;
//   } catch (error) {
//     console.log(error);
//   }
// }

