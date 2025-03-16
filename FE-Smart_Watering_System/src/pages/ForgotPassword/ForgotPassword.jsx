import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaArrowRight, FaSpinner } from "react-icons/fa"; // Import spinner icon
import { toast } from "react-toastify";

import Logo from "../../assets/images/logo.jpeg";

// Component
// import Loading from "../../components/Loading/Loading";

// API
import { forgotPassword, verifyOTP } from "../../services/AuthServices";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [OTP, setOTP] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await forgotPassword(email);
      //   console.log(response);
      if (response?.data?.statusCode === 200) {
        toast.success(response.data.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsLoadingSubmit(true);
    try {
      const response = await verifyOTP(email, OTP);
      //   console.log(response);
      if (response?.data?.statusCode === 200) {
        toast.success(response.data.message);
        navigate("/reset-password");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingSubmit(false);
    }
  };

  // if (isLoading)
  //   return (
  //     <>
  //       <Loading></Loading>
  //     </>
  //   );

  return (
    <div className="bg-gradient-to-br from-blue-100 to-blue-300 flex items-center justify-center h-screen px-4">
      <div className="bg-white shadow-2xl rounded-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center">
          {/* Logo */}
          <div className="w-20 md:w-28 mb-4">
            <img src={Logo} alt="Logo" />
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-secondary font-semibold text-blue-600 mb-2">
            Grade Portal Of HCMUT
          </h1>
          <p className="text-sm text-gray-600 mb-6">Forgot password</p>

          {/* Form */}
          <form
            className="flex flex-col gap-4 w-full"
            onSubmit={handleForgotPassword}
          >
            {/* Email + Send OTP */}
            <div className="flex items-center gap-2">
              <input
                className="p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 transition w-2/3"
                name="email"
                type="text"
                placeholder="Please enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button
                onClick={handleSendOTP}
                className="text-sm md:text-base bg-blue-500 hover:bg-blue-700 cursor-pointer shadow-md transition-all text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <FaSpinner className="animate-spin text-white" /> // Spinner icon
                ) : (
                  "Send OTP"
                )}
              </button>
            </div>

            {/* OTP Input */}
            <input
              className="p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 transition w-full"
              name="OTP"
              type="text"
              placeholder="Please enter OTP"
              value={OTP}
              onChange={(e) => setOTP(e.target.value)}
              required
            />

            {/* Back to Login */}
            <Link
              to="/login"
              className="text-xs text-blue-500 hover:underline self-start"
            >
              Go back to login
            </Link>

            {/* Submit Button */}
            <button
              type="submit"
              className="group bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-full font-medium flex items-center justify-center transition-all shadow-md"
              disabled={isLoadingSubmit}
            >
              {isLoadingSubmit ? (
                <FaSpinner className="animate-spin text-white" /> // Spinner icon
              ) : (
                <>
                  <span>Submit</span>
                  <FaArrowRight className="ml-2 transition-transform group-hover:translate-x-2" />
                </>
              )}
            </button>
          </form>

          {/* OR LOGIN WITH */}
          <div className="my-4 text-gray-500 text-sm">- OR LOGIN WITH -</div>

          {/* Google Login */}
          <button className="bg-white border border-gray-300 p-2 rounded-full flex justify-center items-center text-sm hover:shadow-md transition-transform duration-300">
            <img src={GoogleImg} alt="Google" className="h-6" />
          </button>

          {/* Sign Up Link */}
          <div className="mt-5 text-xs flex justify-center items-center">
            <span className="text-gray-600 mr-1">
              {"Don't have an account?"}
            </span>
            <button
              onClick={() => navigate("/register")}
              className="text-blue-600 hover:underline"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
