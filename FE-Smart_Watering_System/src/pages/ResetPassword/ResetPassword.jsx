import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { FaArrowRight } from "react-icons/fa";
import { toast } from "react-toastify";

import Logo from "../../assets/images/logo.jpeg";

// Component
import Loading from "../../components/Loading/Loading";

// API
import { resetPassword } from "../../services/AuthServices";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await resetPassword(email, newPassword, confirmPassword);

      if (response?.data?.statusCode === 200) {
        toast.success(response.data.message);
        navigate("/login");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading)
    return (
      <>
        <Loading></Loading>
      </>
    );

  return (
    <div className="bg-gradient-to-br from-blue-100 to-blue-300 flex items-center justify-center h-screen px-4">
      <div className="bg-white shadow-2xl rounded-2xl w-full max-w-sm md:max-w-md p-8">
        <div className="flex flex-col items-center">
          {/* Logo */}
          <div className="w-20 md:w-28 mb-4">
            <img src={Logo} alt="Logo" />
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-secondary font-semibold text-blue-600 mb-2">
            Grade Portal Of HCMUT
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            Please enter email and new password
          </p>

          {/* Form */}
          <form
            className="flex flex-col gap-4 w-full"
            onSubmit={handleResetPassword}
          >
            <input
              className="p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 transition"
              name="email"
              type="text"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative">
              <input
                className="p-3 w-full border border-gray-300 rounded-lg outline-none focus:border-blue-500 transition"
                name="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <div
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <AiFillEye size={20} />
                ) : (
                  <AiFillEyeInvisible size={20} />
                )}
              </div>
            </div>

            {/* CONFIRM PASSWORD  */}
            <div className="relative">
              <input
                className="p-3 w-full border border-gray-300 rounded-lg outline-none focus:border-blue-500 transition"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <div
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <AiFillEye size={20} />
                ) : (
                  <AiFillEyeInvisible size={20} />
                )}
              </div>
            </div>

            <button className="group bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-full font-medium flex items-center justify-center transition-all shadow-md">
              <span>Submit</span>
              <FaArrowRight className="ml-2 transition-transform group-hover:translate-x-2" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
