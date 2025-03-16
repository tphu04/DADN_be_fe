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

// Pages
import Login from "./pages/Login/Login";
import SignUp from "./pages/SignUp/SignUp";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/ResetPassword/ResetPassword";

import HomePage from "./pages/HomePage/HomePage";
import Dashboard from "./pages/Dashboard/Dashboard";

// Admin

// User

function App() {
  const { isLoggedIn } = useAuth();

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Auth routes - Không thể truy cập nếu đã đăng nhập */}
        <Route 
          path="/sign-up" 
          element={isLoggedIn() ? <Navigate to="/" /> : <SignUp />} 
        />
        <Route 
          path="/login" 
          element={isLoggedIn() ? <Navigate to="/" /> : <Login />} 
        />
        <Route 
          path="/forgot-password" 
          element={isLoggedIn() ? <Navigate to="/" /> : <ForgotPassword />} 
        />
        <Route 
          path="/reset-password" 
          element={isLoggedIn() ? <Navigate to="/" /> : <ResetPassword />} 
        />

        {/* Trang chủ công khai */}
        <Route path="/" element={<HomePage />} />

        {/* Các trang cần đăng nhập */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <SidebarLayout>
                <Dashboard />
              </SidebarLayout>
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        {/* <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <SidebarLayout>
                <AdminDashboard />
              </SidebarLayout>
            </ProtectedRoute>
          }
        /> */}

        {/* Route không tồn tại - Redirect về trang chủ */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <ToastContainer />
    </>
  );
}

export default App;
