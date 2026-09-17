import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import {
  HiOutlineChevronDown,
  HiOutlineMenu,
  HiOutlineX,
} from "react-icons/hi";

const Layout = ({ children, noPadding = false }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Date time like in image: 16 Sep 2025  06:12 PM
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Billing page should not scroll whole page, only inner div
  const isBilling = location.pathname === "/billing";

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="ml-0 lg:ml-55 flex-1 flex flex-col min-w-0 h-screen">
        {/* Top Header - like image: white, date time right, Admin */}
        <header className="h-14 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            className="lg:hidden w-9 h-9 rounded-lg border border-gray-200 text-gray-700 flex items-center justify-center"
            aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
          >
            {sidebarOpen ? (
              <HiOutlineX className="text-lg" />
            ) : (
              <HiOutlineMenu className="text-lg" />
            )}
          </button>
          <div className="flex items-center gap-3 sm:gap-6 ml-auto">
            <span className="hidden sm:inline text-[13px] text-gray-700 font-medium">
              {dateStr} <span className="ml-3">{timeStr}</span>
            </span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#111111] flex items-center justify-center text-white text-[12px] font-bold">
                {(user?.name || "A").charAt(0).toUpperCase()}
              </div>
              <span className="text-[13px] font-semibold text-gray-800">
                {user?.name?.split(" ")[0] || "Admin"}
              </span>
              <HiOutlineChevronDown className="text-gray-500 text-[12px]" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          className={`${isBilling ? "flex-1 overflow-hidden p-0" : "flex-1 overflow-auto"} ${noPadding ? "" : isBilling ? "" : "p-4 sm:p-5 lg:p-6"}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
