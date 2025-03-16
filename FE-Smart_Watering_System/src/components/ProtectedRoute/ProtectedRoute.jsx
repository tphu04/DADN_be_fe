import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loading from '../Loading/Loading';

/**
 * ProtectedRoute - Bảo vệ route yêu cầu đăng nhập
 * @param {React.ReactNode} children - Component con được render nếu đã đăng nhập
 * @returns {React.ReactNode}
 */
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();

  // Nếu đang kiểm tra xác thực, hiển thị loading
  if (loading) {
    return <Loading />;
  }

  // Nếu chưa đăng nhập, chuyển hướng đến trang đăng nhập
  if (!isLoggedIn()) {
    return <Navigate to="/login" />;
  }

  // Nếu đã đăng nhập, render component con
  return children;
};

export default ProtectedRoute; 