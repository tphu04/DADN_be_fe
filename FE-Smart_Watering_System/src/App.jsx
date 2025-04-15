// import { useState } from "react";
// import reactLogo from "./assets/react.svg";
// import viteLogo from "/vite.svg";
import "./App.css";
import "react-toastify/dist/ReactToastify.css";

import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import SidebarLayout from "./components/layout/SidebarLayout";
import ScrollToTop from "./components/ScrollToTop/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { isAdmin } from "./services/AdminServices";

// Pages
import Login from "./pages/Login/Login";
import SignUp from "./pages/SignUp/SignUp";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/ResetPassword/ResetPassword";

import HomePage from "./pages/HomePage/HomePage";
import Dashboard from "./pages/Dashboard/Dashboard";
import DeviceDetail from "./components/DeviceDetail/DeviceDetail";
import DeviceSetting from "./pages/DeviceSetting/DeviceSetting";
import ConfigDevice from "./pages/ConfigDevice/ConfigDevice";
import Notification from "./pages/Notification/Notification";
import ControlDevice from "./pages/ControlDevice/ControlDevice";

// Admin
import UserManagement from "./pages/Admin/UserManagement";
import DeviceManagement from "./pages/Admin/DeviceManagement";

// User

function App() {
  const { isLoggedIn } = useAuth();
  const adminUser = isAdmin();

  // Function to redirect based on user role
  const getRedirectPath = () => {
    if (adminUser) {
      return "/admin/users"; // Admins go to user management page
    }
    return "/dashboard"; // Regular users go to dashboard
  };

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Auth routes - Không thể truy cập nếu đã đăng nhập */}
        <Route
          path="/sign-up"
          element={isLoggedIn() ? <Navigate to={getRedirectPath()} /> : <SignUp />}
        />
        <Route
          path="/login"
          element={isLoggedIn() ? <Navigate to={getRedirectPath()} /> : <Login />}
        />
        <Route
          path="/forgot-password"
          element={isLoggedIn() ? <Navigate to={getRedirectPath()} /> : <ForgotPassword />}
        />
        <Route
          path="/reset-password"
          element={isLoggedIn() ? <Navigate to={getRedirectPath()} /> : <ResetPassword />}
        />

        {/* Trang chủ công khai */}
        <Route path="/" element={
          isLoggedIn() ? <Navigate to={getRedirectPath()} /> : <HomePage />
        } />

        {/* Các trang cần đăng nhập */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              {adminUser ? <Navigate to="/admin/users" /> : (
                <SidebarLayout>
                  <Dashboard />
                </SidebarLayout>
              )}
            </ProtectedRoute>
          }
        />

        <Route
          path="/device-setting"
          element={
            <ProtectedRoute>
              {adminUser ? <Navigate to="/admin/users" /> : (
                <SidebarLayout>
                  <DeviceSetting />
                </SidebarLayout>
              )}
            </ProtectedRoute>
          }
        />

        <Route
          path="/notification"
          element={
            <ProtectedRoute>
              {adminUser ? <Navigate to="/admin/users" /> : (
                <SidebarLayout>
                  <Notification />
                </SidebarLayout>
              )}
            </ProtectedRoute>
          }
        />

        <Route
          path="/config"
          element={
            <ProtectedRoute>
              {adminUser ? <Navigate to="/admin/users" /> : (
                <SidebarLayout>
                  <ConfigDevice />
                </SidebarLayout>
              )}
            </ProtectedRoute>
          }
        />

        <Route
          path="/config/:deviceId"
          element={
            <ProtectedRoute>
              {adminUser ? <Navigate to="/admin/users" /> : (
                <SidebarLayout>
                  <ConfigDevice />
                </SidebarLayout>
              )}
            </ProtectedRoute>
          }
        />

        <Route
          path="/control"
          element={
            <ProtectedRoute>
              {adminUser ? <Navigate to="/admin/users" /> : (
                <SidebarLayout>
                  <ControlDevice />
                </SidebarLayout>
              )}
            </ProtectedRoute>
          }
        />

        {/* Trang chi tiết thiết bị */}
        <Route
          path="/dashboard/device/:deviceId"
          element={
            <ProtectedRoute>
              {adminUser ? <Navigate to="/admin/users" /> : (
                <SidebarLayout>
                  <DeviceDetail />
                </SidebarLayout>
              )}
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <SidebarLayout>
                <UserManagement />
              </SidebarLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/devices"
          element={
            <ProtectedRoute>
              <SidebarLayout>
                <DeviceManagement />
              </SidebarLayout>
            </ProtectedRoute>
          }
        />

        {/* Route không tồn tại - Redirect về trang chủ hoặc dashboard/admin */}
        <Route path="*" element={<Navigate to={isLoggedIn() ? getRedirectPath() : "/"} />} />
      </Routes>
      <ToastContainer />
    </>
  );
}

export default App;
