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
    const res = await axios.post("/auth/login", {
      username,
      password,
    });

    if (res.data.success) {
      // Lưu token vào localStorage nếu đăng nhập thành công
      localStorage.setItem("token", res.data.data.token);
      // Lưu thông tin người dùng
      localStorage.setItem("user", JSON.stringify(res.data.data.user));
    }

    return res.data;
  } catch (error) {
    toast.error(error?.response?.data?.message || "Đăng nhập không thành công");
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
  return localStorage.getItem('token') !== null;
}

/**
 * Lấy thông tin người dùng từ localStorage
 * @returns {Object|null} - Thông tin người dùng hoặc null nếu không có
 */
export function getUser() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
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

