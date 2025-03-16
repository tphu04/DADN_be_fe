import { Link, useLocation, useNavigate } from "react-router-dom";

// Image
import Logo from "../../assets/images/logo.jpeg";
import BackGround from "../../assets/images/bg.jpeg";

// Component
import Footer from "../../components/Footer/Footer";

const HomePage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { name: "Home Page", path: "/" },
    { name: "About Us", path: "/about" },
    { name: "More Info", path: "/more-info" },
  ];

  return (
    <>
      {/* Header  */}
      <div className="my-[30px] mx-[64px] flex flex-row items-center">
        <Link to="/" className="w-1/2 flex flex-row items-center">
          <img src={Logo} alt="logo" className="w-[80px]" />
          <div className="flex font-quicksand font-bold text-[32px]">
            <p className="text-[#2AF598]">Green</p>
            <p className="text-[#08AEEA]">Tech</p>
          </div>
        </Link>

        <div className="flex flex-row items-center font-roboto text-[16px] font-semibold">
          <div className="flex flex-row items-center space-x-[32px]">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-[10px] py-[12px] transition ${
                  location.pathname === item.path
                    ? "bg-[#9CDBA6] rounded-[10px] shadow-[4px_4px_2px_0px_#52ACFF]"
                    : ""
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="ml-[75px] flex flex-row space-x-[16px]">
            <Link
              to="/login"
              className="px-[20px] py-[8px] border border-black hover:text-white hover:bg-black transition-all"
            >
              Join
            </Link>
            <Link
              to="/sign-up"
              className="px-[20px] py-[8px] border border-black bg-black text-white hover:text-black hover:bg-white transition-all"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>

      {/* Main  */}
      <div className="my-[112px] mx-[64px] flex flex-row">
        {/* Left side  */}
        <div className="font-roboto w-1/2 mr-[80px]">
          <div className="text-[56px] font-bold leading-[67.2px]">
            Innovative Solutions for a Green Future
          </div>
          <div className="mt-[24px] text-[18px] font-normal leading-[27px]">
            Explore innovative automation solutions designed to optimize crop
            care and promote sustainability. Join us in leveraging technology to
            create a more efficient future for agriculture.
          </div>
          <button
            className="mt-[32px] px-[24px] py-[12px] bg-black text-white w-[120px] hover:opacity-60"
            onClick={() => navigate("/dashboard")}
          >
            Start Now
          </button>
        </div>

        {/* Right side  */}
        <div className="w-1/2">
          <img
            src={BackGround}
            alt="background"
            className="object-cover w-full h-[640px]"
          />
        </div>
      </div>

      <Footer />
    </>
  );
};

export default HomePage;
