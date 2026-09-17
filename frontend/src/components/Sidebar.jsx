import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  HiOutlineViewGrid,
  HiOutlineReceiptTax,
  HiOutlineDocumentText,
  HiOutlineClipboardList,
  HiOutlineTrendingUp,
  HiOutlineShoppingCart,
  HiOutlineCube,
  HiOutlineUsers,
  HiOutlineUserGroup,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineClock,
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineIdentification,
} from "react-icons/hi";
import { RiShoppingCartFill } from "react-icons/ri";

// Flat menu - no groups, order aligned as per theme
const navItems = [
  { label: "Billing", to: "/billing", icon: HiOutlineDocumentText },
  { label: "Products", to: "/products", icon: HiOutlineCube },
  { label: "Inventory", to: "/products", icon: HiOutlineCube, alias: true }, // Inventory points to Products - kept for theme match, will hide duplicate
  { label: "Customers", to: "/customers", icon: HiOutlineUsers },
  { label: "Invoices", to: "/invoices", icon: HiOutlineReceiptTax },
  { label: "Sales", to: "/sales", icon: HiOutlineTrendingUp },
  { label: "Purchases", to: "/purchases", icon: HiOutlineShoppingCart },
  { label: "Quotations", to: "/quotations", icon: HiOutlineClipboardList },
  { label: "Employees", to: "/employees", icon: HiOutlineIdentification },
  { label: "Attendance", to: "/attendance", icon: HiOutlineClock },
  { label: "Reports", to: "/dashboard", icon: HiOutlineViewGrid },
  { label: "Settings", to: "/settings", icon: HiOutlineCog },
];

// Secondary - Employee extended (visible when on employee pages)
const employeeExtra = [
  {
    label: "Attendance History",
    to: "/attendance-history",
    icon: HiOutlineCalendar,
  },
  {
    label: "Attendance Reports",
    to: "/attendance-reports",
    icon: HiOutlineChartBar,
  },
  { label: "Staff Users", to: "/users", icon: HiOutlineUserGroup },
];

const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { logout, hasPermission } = useAuth();

  // For theme: show only primary items + if user is on employee section, show extras
  // But to keep it clean like image, we show all in flat order without topic headings
  const allItems = [
    {
      label: "Dashboard",
      to: "/dashboard",
      icon: HiOutlineViewGrid,
      perm: null,
    },
    {
      label: "Billing",
      to: "/billing",
      icon: HiOutlineDocumentText,
      perm: "sales.create",
    },
    {
      label: "Products",
      to: "/products",
      icon: HiOutlineCube,
      perm: "products.view",
    },
    {
      label: "Customers",
      to: "/customers",
      icon: HiOutlineUsers,
      perm: "customers.view",
    },
    {
      label: "Invoices",
      to: "/invoices",
      icon: HiOutlineDocumentText,
      perm: "invoice.view",
    },
    {
      label: "Sales",
      to: "/sales",
      icon: HiOutlineTrendingUp,
      perm: "sales.view",
    },
    {
      label: "Purchases",
      to: "/purchases",
      icon: HiOutlineShoppingCart,
      perm: "purchases.view",
    },
    {
      label: "Quotations",
      to: "/quotations",
      icon: HiOutlineClipboardList,
      perm: "quotation.manage",
    },
    {
      label: "Employees",
      to: "/employees",
      icon: HiOutlineIdentification,
      perm: "employees.view",
    },
    {
      label: "Attendance",
      to: "/attendance",
      icon: HiOutlineClock,
      perm: "attendance.view",
    },
    {
      label: "Attendance History",
      to: "/attendance-history",
      icon: HiOutlineCalendar,
      perm: "attendance.view",
    },
    {
      label: "Reports",
      to: "/attendance-reports",
      icon: HiOutlineChartBar,
      perm: "attendance.reports",
    },
    {
      label: "Staff Users",
      to: "/users",
      icon: HiOutlineUserGroup,
      perm: "users.manage",
    },
    {
      label: "Settings",
      to: "/settings",
      icon: HiOutlineCog,
      perm: "settings.manage",
    },
  ];

  const visibleItems = allItems.filter(
    (item) => !item.perm || hasPermission(item.perm),
  );

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
          aria-label="Close navigation overlay"
        />
      )}
      <aside
        className={`${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 w-55 bg-[#111111] fixed left-0 top-0 h-screen flex flex-col z-40 transition-transform duration-200`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <RiShoppingCartFill className="text-[#111111] text-[18px]" />
          </div>
          <span className="text-white font-semibold text-[14px] truncate">
            BillPro
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                    isActive
                      ? "bg-[#2a2a2a] text-white"
                      : "text-[#9ca3af] hover:bg-[#1e1e1e] hover:text-white"
                  }`
                }
              >
                <Icon className="text-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-[#1f1f1f]">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-[13px] font-medium text-[#9ca3af] hover:bg-[#1e1e1e] hover:text-white transition-colors"
          >
            <HiOutlineLogout className="text-[18px]" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
