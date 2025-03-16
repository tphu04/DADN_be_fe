import { IoLogOutOutline } from "react-icons/io5";
import { useAuth } from "../../context/AuthContext";

// Icon
import { IoNotificationsOutline } from "react-icons/io5";
import IconSearch from "../../assets/images/icon-search.svg";
import Avt from "../../assets/images/avt.jpeg";

const Header = () => {
  const auth = useAuth();

  return (
    // <header className="p-4 flex justify-between items-center">
    //   <div>
    //     <h1 className="text-xl font-secondary font-bold text-gray-800">
    //       Công Thành
    //     </h1>
    //     <span className="text-sm text-gray-500 font-primary">Student</span>
    //   </div>
    //   <div className="flex items-center">
    //     {/* <span className="text-gray-600 mr-4">User Name</span> */}
    //     <button
    //       onClick={() => auth.logOut()}
    //       className="bg-red-600 hover:bg-red-700 px-4 py-2 text-white rounded flex items-center space-x-2 font-primary"
    //     >
    //       <IoLogOutOutline size={20} />
    //       <span>Logout</span>
    //     </button>
    //   </div>
    // </header>

    <>
      <div className="flex flex-row items-center justify-between pt-[20px] px-[30px] bg-white h-[112px]">
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
      </div>
    </>
  );
};

export default Header;
