import { IoLogOutOutline } from "react-icons/io5";
import { useAuth } from "../../context/AuthContext";

// Icon
import { IoNotificationsOutline } from "react-icons/io5";
import IconSearch from "../../assets/images/icon-search.svg";
import Avt from "../../assets/images/avt.jpeg";

const Header = () => {
  const auth = useAuth();

  return (
    <>
      <header className="flex flex-row items-center justify-between pt-[20px] px-[30px] bg-white h-[112px] shadow-lg">
        <div className="font-poppins text-[32px] font-bold">Dashboard</div>
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
          <IoNotificationsOutline size={25} />
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
