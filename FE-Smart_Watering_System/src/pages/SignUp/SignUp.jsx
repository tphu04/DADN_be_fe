import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { FaArrowRight } from "react-icons/fa";
import { toast } from "react-toastify";

// Image
import Logo from "../../assets/images/logo.jpeg";
import BackGround from "../../assets/images/bg.jpeg";

// Component
import Loading from "../../components/Loading/Loading";

// API
import { register } from "../../services/AuthServices";

const SignUp = () => {
  // Form dữ liệu đăng ký
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    phone: "",
    fullname: "",
    address: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Kiểm tra mật khẩu xác nhận
    if (formData.password !== formData.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!");
      setIsLoading(false);
      return;
    }

    try {
      // Gửi mật khẩu không mã hóa, backend sẽ lưu trực tiếp
      const response = await register(
        formData.username,
        formData.password,
        formData.email,
        formData.phone,
        formData.fullname,
        formData.address
      );

      if (response.success) {
        toast.success(response.message || "Đăng ký thành công!");
        navigate("/login");
      } else {
        toast.error(response.message || "Đăng ký không thành công!");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Đăng ký không thành công!"
      );
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
    <>
      <div className="flex flex-row max-h-screen overflow-hidden relative">
        <div className="w-[867px]">
          <img
            src={BackGround}
            alt="background signup"
            className="w-full object-cover"
          />
        </div>
        <div className="w-[571px]">
          {/* Logo  */}
          <div className="mt-[50px] flex flex-row items-center justify-center">
            <img src={Logo} alt="logo" className="w-[80px]" />
            <div className="flex font-quicksand font-bold text-[32px]">
              <p className="text-[#2AF598]">Green</p>
              <p className="text-[#08AEEA]">Tech</p>
            </div>
          </div>
        </div>

        {/* Form signup  */}
        <div
          className="absolute top-1/2 left-1/2 bg-white transform -translate-x-1/2 -translate-y-1/2
            w-[532px] px-[95px] py-[28px] rounded-[10px] border border-black 
            shadow-[6px_6px_0px_0px_#9CDBA6] font-poppins"
        >
          {/* Title  */}
          <div className=" font-semibold ">
            <div className="text-[48px] text-[#52ACFF]">Sign Up</div>
            <div className="text-[24px] bg-gradient-to-t from-black/60 to-black/60 bg-clip-text text-transparent">
              To Create Your Account
            </div>
          </div>

          {/* Form */}
          <form
            className="flex flex-col w-full mt-[45px]"
            onSubmit={handleSignup}
          >
            <div>
              <div className="text-[#013220] text-[14px] font-normal">
                Username
              </div>
              <input
                className="w-full px-[15px] py-[8px] rounded-[11px] shadow-md border border-[#D9D9D9] outline-none"
                name="username"
                type="text"
                placeholder="Enter Username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="text-[#013220] text-[14px] font-normal mt-[13px]">
              E-mail
            </div>
            <input
              className="w-full px-[15px] py-[8px] rounded-[11px] shadow-md border border-[#D9D9D9] outline-none"
              name="email"
              type="email"
              placeholder="Enter E-mail"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <div className="text-[#013220] text-[14px] font-normal mt-[13px]">
              Password
            </div>
            <div className="relative">
              <input
                className="w-full px-[15px] py-[8px] rounded-[11px] shadow-md border border-[#D9D9D9] outline-none"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter Password"
                value={formData.password}
                onChange={handleChange}
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

            <div className="text-[#013220] text-[14px] font-normal mt-[13px]">
              Confirm Password
            </div>
            <div className="relative">
              <input
                className="w-full px-[15px] py-[8px] rounded-[11px] shadow-md border border-[#D9D9D9] outline-none"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
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

            <div className="text-[#013220] text-[14px] font-normal mt-[13px]">
              Phone
            </div>
            <input
              className="w-full px-[15px] py-[8px] rounded-[11px] shadow-md border border-[#D9D9D9] outline-none"
              name="phone"
              type="text"
              placeholder="Enter Phone Number"
              value={formData.phone}
              onChange={handleChange}
              required
            />

            <div className="text-[#013220] text-[14px] font-normal mt-[13px]">
              Full Name
            </div>
            <input
              className="w-full px-[15px] py-[8px] rounded-[11px] shadow-md border border-[#D9D9D9] outline-none"
              name="fullname"
              type="text"
              placeholder="Enter Full Name"
              value={formData.fullname}
              onChange={handleChange}
              required
            />

            <div className="text-[#013220] text-[14px] font-normal mt-[13px]">
              Address
            </div>
            <input
              className="w-full px-[15px] py-[8px] rounded-[11px] shadow-md border border-[#D9D9D9] outline-none"
              name="address"
              type="text"
              placeholder="Enter Address (Optional)"
              value={formData.address}
              onChange={handleChange}
            />

            {/* Button  */}
            <div className="flex items-center justify-center">
              <button
                className="mt-[42px] bg-[#0D986A] rounded-[20px] px-[40px] py-[20px] shadow-[0px_8px_28px_0px_#4F756980]
              text-[19px] text-white font-medium w-[300px] hover:opacity-80"
              >
                Sign Up
              </button>
            </div>
          </form>

          {/* Sign Up Link */}
          <div className="mt-[26px] text-[15px] font-normal flex justify-center items-center">
            <span className="text-[#AFAFAF] mr-1">
              {"Already have an account?"}
            </span>
            <button
              onClick={() => navigate("/login")}
              className="bg-gradient-to-t from-[#0D986A] to-[#0D986A] bg-clip-text text-transparent"
            >
              <div className="hover:underline decoration-[#013220]">Login</div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignUp;
