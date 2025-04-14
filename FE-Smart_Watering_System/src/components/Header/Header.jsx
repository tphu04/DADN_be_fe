import { IoLogOutOutline } from "react-icons/io5";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";

// Icon
import { IoNotifications } from "react-icons/io5";
import IconSearch from "../../assets/images/icon-search.svg";
import Avt from "../../assets/images/avt.jpeg";
import { useLocation } from "react-router-dom";

const Header = () => {
  const location = useLocation();
  
  // Hàm lấy tiêu đề từ URL
  const formatHeaderTitle = (pathname) => {
    const paths = pathname.split('/').filter(p => p !== '');
    const lastPath = paths[paths.length - 1] || ''; 
    return lastPath
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };


  return (
    <>
      <header className="flex flex-row items-center justify-between pt-[20px] px-[30px] h-[112px] shadow">
        <div className="font-poppins text-[32px] font-bold text-black">
        {formatHeaderTitle(location.pathname)}
        </div>
        <div className="flex flex-row space-x-[40px] items-center">
          <div className="p-[4px] border rounded-[6px] flex w-[332px]">
            <input
              type="text"
              placeholder="Key word"
              className="pl-[8px] w-full outline-none"
            />
            <div className="flex justify-end">
              <img
                src={IconSearch}
                alt="icon search"
                className="bg-black py-[4px] px-[8px] rounded-[4px] hover:opacity-60"
              />
            </div>
          </div>
          <Link to="/notification">
            <IoNotifications
              size={25}
              className="text-black hover:opacity-60 cursor-pointer"
            />
          </Link>
          <img
            src={Avt}
            alt="avt"
            className="h-[53px] w-[53px] object-cover rounded-full"
          />
        </div>
      </header>
    </>
  );
};

export default Header;
