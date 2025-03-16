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

const Sidebar = () => {
  const getNavLinkClass = (isActive) =>
    `flex items-center space-x-[8px] p-[8px] w-full hover:bg-[#9CDBA6] rounded-[2px] hover:shadow-[4px_4px_2px_0px_#52ACFF] transition-all
    ${isActive ? "bg-[#9CDBA6] shadow-[4px_4px_2px_0px_#52ACFF]" : ""}`;

  const navActivated = `bg-[#9CDBA6] rounded-[10px] shadow-[4px_4px_2px_0px_#52ACFF]`;
  return (
    // <div className="p-4 w-full">
    //   {/* Logo HCMUT */}
    //   <div className="flex flex-row items-center my-2">
    //     <div className="rounded-full bg-white p-1 w-16 h-16">
    //       <img
    //         src={Logo}
    //         alt="Logo HCMUT"
    //         className="h-full w-full rounded-full object-cover
    //         "
    //       />
    //     </div>
    //     <div className="text-[25px] font-secondary font-semibold mx-4">
    //       HCMUT
    //     </div>
    //   </div>

    //   {/* Path Link */}
    //   <div className="my-10 flex flex-col items-center justify-center gap-4 font-secondary font-medium text-[17px]">
    //     <NavLink to="/" className={({ isActive }) => getNavLinkClass(isActive)}>
    //       <GoHome size={22} />
    //       <div>Dashboard</div>
    //     </NavLink>

    //     {/* role ADMIN  */}
    //     <NavLink
    //       to="/admin/all-classes"
    //       className={({ isActive }) => getNavLinkClass(isActive)}
    //     >
    //       <IoLibraryOutline size={20} />
    //       <div>All classes</div>
    //     </NavLink>

    //     {/* role STUDENT  */}
    //     <NavLink
    //       to="/student/my-courses"
    //       className={({ isActive }) => getNavLinkClass(isActive)}
    //     >
    //       <IoLibraryOutline size={20} />
    //       <div>My courses</div>
    //     </NavLink>

    //     <NavLink
    //       to="/student/grade"
    //       className={({ isActive }) => getNavLinkClass(isActive)}
    //     >
    //       Grade
    //     </NavLink>
    //     <NavLink
    //       to="/notifications"
    //       className={({ isActive }) => getNavLinkClass(isActive)}
    //     >
    //       Notifications
    //     </NavLink>

    //     <NavLink
    //       to="/settings"
    //       className={({ isActive }) => getNavLinkClass(isActive)}
    //     >
    //       <IoSettingsOutline size={22} />
    //       <div>Settings</div>
    //     </NavLink>
    //   </div>
    // </div>

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
        </div>
      </div>
    </>
  );
};

export default Sidebar;
