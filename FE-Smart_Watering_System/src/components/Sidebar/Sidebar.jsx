import { NavLink } from "react-router-dom";
import Logo from "../../assets/images/logo.jpeg";
import { IoSettingsOutline } from "react-icons/io5";
import { GoHome } from "react-icons/go";
import { IoLibraryOutline } from "react-icons/io5";

// Icon
import IconDashBoard from "../../assets/images/icon-dashboard.svg";
import IconSetting from "../../assets/images/icon-setting.png";
import IconNotification from "../../assets/images/icon-notification.svg";
import IconConfig from "../../assets/images/icon-config.png";
import IconProfile from "../../assets/images/icon-profile.svg";
import IconHelp from "../../assets/images/icon-help.svg";
import { IoIosLogOut } from "react-icons/io";

// Auth Context
import { useAuth } from "../../context/AuthContext";

const Sidebar = () => {
  const { logout } = useAuth();

  const getNavLinkClass = (isActive) =>
    `flex items-center space-x-[8px] p-[8px] w-full hover:bg-[#9CDBA6] rounded-[2px] hover:shadow-[4px_4px_2px_0px_#52ACFF] transition-all
    ${isActive ? "bg-[#9CDBA6] shadow-[4px_4px_2px_0px_#52ACFF]" : ""}`;

  return (
    <>
      <div className="px-[20px] py-[30px] w-[290px] bg-white flex flex-col justify-between">
        <div>
          {/* Logo  */}
          <div className="flex flex-col items-center justify-center">
            <img src={Logo} alt="logo" className="w-[50px] object-cover" />
            <div className="flex font-quicksand font-bold text-[32px]">
              <p className="text-[#2AF598]">Green</p>
              <p className="text-[#08AEEA]">Tech</p>
            </div>
          </div>

          {/* Nav  */}
          <div className="font-roboto text-[16px] font-semibold flex flex-col items-start justify-center gap-y-[20px] mt-[30px]">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => getNavLinkClass(isActive)}
            >
              <img src={IconDashBoard} alt="icon dashboard" />
              <div>Dashboard</div>
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) => getNavLinkClass(isActive)}
            >
              <img
                src={IconSetting}
                alt="icon setting"
                className="w-[18px] h-[23px] object-cover"
              />
              <div>Device Setting</div>
            </NavLink>
            <NavLink
              to="/notification"
              className={({ isActive }) => getNavLinkClass(isActive)}
            >
              <img
                src={IconNotification}
                alt="icon notification"
                className="w-[14px] h-[18px] object-cover"
              />
              <div>Notification</div>
            </NavLink>
            <NavLink
              to="/config"
              className={({ isActive }) => getNavLinkClass(isActive)}
            >
              <img
                src={IconConfig}
                alt="icon config"
                className="w-[23px] h-[23px] object-cover"
              />
              <div>Configure Server & Devices</div>
            </NavLink>
          </div>
        </div>

        {/* Profile & help  */}
        <div>
          <NavLink
            to="/profile"
            className={({ isActive }) => getNavLinkClass(isActive)}
          >
            <img
              src={IconProfile}
              alt="icon profile"
              className="w-[18px] h-[14px] object-cover"
            />
            <div>Profile Settings</div>
          </NavLink>

          <NavLink
            to="/help"
            className={({ isActive }) => getNavLinkClass(isActive)}
          >
            <img
              src={IconHelp}
              alt="icon help"
              className="w-[18px] h-[14px] object-cover"
            />
            <div>Help</div>
          </NavLink>

          <div className="w-full text-white font-medium mt-4 flex items-center justify-center">
            <button
              className="py-2 px-8 rounded-lg bg-red-600 hover:bg-red-700 transition-all flex items-center justify-center space-x-2"
              onClick={logout}
            >
              <IoIosLogOut size={20} />
              <div>Logout</div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
