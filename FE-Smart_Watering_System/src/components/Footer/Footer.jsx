const Footer = () => {
  return (
    <>
      <div
        className="h-[181px] bg-gradient-to-t from-[#0D986A] to-[#0D986A] 
      font-roboto text-[14px] font-normal flex flex-col justify-between"
      >
        <div className="border-t border-white mt-[80px] mx-[64px]">
          <div className="pt-[32px] flex flex-row space-x-[24px] items-center justify-center text-white">
            <div>© 2025 . All rights reserved.</div>
            <div className="hover:underline">Privacy Policy</div>
            <div className="hover:underline">Terms of Service</div>
            <div className="hover:underline">Cookies Settings</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Footer;
