import { useContext, createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import {
  login as loginApi,
  logout as logoutApi,
  getUserProfile,
  isAuthenticated,
  getUser,
} from "../services/AuthServices";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  // Khởi tạo trạng thái người dùng từ localStorage nếu có
  const [user, setUser] = useState(getUser());
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Kiểm tra xác thực khi component được mount
  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated()) {
        try {
          const response = await getUserProfile();
          if (response.success) {
            setUser(response.data);
          }
        } catch (error) {
          console.error("Failed to get user profile:", error);
        }
      }
    };

    checkAuth();
  }, []);

  // Đăng nhập
  const login = async (username, password) => {
    setLoading(true);
    try {
      // Backend không còn mã hóa mật khẩu, gửi trực tiếp
      const response = await loginApi(username, password);
      if (response.success) {
        setUser(response.data.user);
        setToken(response.data.token);
        toast.success(response.message || "Đăng nhập thành công!");
        return true;
      } else {
        toast.error(response.message || "Đăng nhập không thành công!");
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error(
        error?.response?.data?.message || "Đăng nhập không thành công!"
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Đăng xuất
  const logout = async () => {
    setLoading(true);
    try {
      await logoutApi();
      setUser(null);
      setToken("");
      navigate("/login");
      toast.success("Logout successful");
    } catch (error) {
      console.error("Logout error:", error);
      // Vẫn xóa dữ liệu người dùng ngay cả khi API gọi thất bại
      setUser(null);
      setToken("");
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra người dùng đã đăng nhập chưa
  const isLoggedIn = () => {
    return !!token;
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        logout,
        isLoggedIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;

export const useAuth = () => {
  return useContext(AuthContext);
};
