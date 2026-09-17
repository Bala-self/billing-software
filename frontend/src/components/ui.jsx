/**
 * Shared UI primitives for a consistent professional design system.
 * Import these into any page instead of ad-hoc Tailwind classes.
 */

// ─── Status Badge ─────────────────────────────────────────────────────────────
export const statusCls = {
  Paid:            "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Partially Paid":"bg-amber-50 text-amber-700 border border-amber-200",
  Unpaid:          "bg-red-50 text-red-600 border border-red-200",
  Cancelled:       "bg-slate-100 text-slate-500 border border-slate-200",
  Draft:           "bg-slate-100 text-slate-500 border border-slate-200",
  Converted:       "bg-blue-50 text-blue-700 border border-blue-200",
  Active:          "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Inactive:        "bg-slate-100 text-slate-500 border border-slate-200",
  "Low Stock":     "bg-amber-50 text-amber-700 border border-amber-200",
  "Out of Stock":  "bg-red-50 text-red-600 border border-red-200",
};

export const StatusBadge = ({ status, className = "" }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${statusCls[status] || "bg-slate-100 text-slate-500 border border-slate-200"} ${className}`}>
    {status}
  </span>
);

// ─── Page Header ─────────────────────────────────────────────────────────────
export const PageHeader = ({ title, subtitle, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
    <div>
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

// ─── Toast Notification ───────────────────────────────────────────────────────
import { HiOutlineCheckCircle, HiOutlineExclamation, HiOutlineX } from "react-icons/hi";

export const Toast = ({ type, message, onClose }) => (
  <div className={`mb-4 flex items-center gap-2.5 text-sm px-4 py-3 rounded-lg border ${
    type === "success"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : "bg-red-50 border-red-200 text-red-600"
  }`}>
    {type === "success"
      ? <HiOutlineCheckCircle className="shrink-0 text-base" />
      : <HiOutlineExclamation className="shrink-0 text-base" />}
    <span className="flex-1 text-xs">{message}</span>
    <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100">
      <HiOutlineX className="text-sm" />
    </button>
  </div>
);

// ─── Table Shell ─────────────────────────────────────────────────────────────
export const TableCard = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg border border-slate-200 overflow-hidden ${className}`}>
    {children}
  </div>
);

export const Th = ({ children, right = false, center = false, className = "" }) => (
  <th className={`py-2.5 px-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap ${right ? "text-right" : center ? "text-center" : ""} ${className}`}>
    {children}
  </th>
);

// ─── Table Header Row ─────────────────────────────────────────────────────────
export const Thead = ({ children }) => (
  <thead className="bg-slate-50 border-b border-slate-200">
    <tr>{children}</tr>
  </thead>
);

// ─── Form Inputs ─────────────────────────────────────────────────────────────
export const inputCls =
  "w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition";

export const Field = ({ label, required, hint, children, className = "" }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
  </div>
);

// ─── Primary Button ───────────────────────────────────────────────────────────
export const PrimaryBtn = ({ children, className = "", ...props }) => (
  <button
    className={`flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all ${className}`}
    {...props}
  >
    {children}
  </button>
);

// ─── Secondary Button ─────────────────────────────────────────────────────────
export const SecondaryBtn = ({ children, className = "", ...props }) => (
  <button
    className={`flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-all ${className}`}
    {...props}
  >
    {children}
  </button>
);

// ─── Danger Button ────────────────────────────────────────────────────────────
export const DangerBtn = ({ children, className = "", ...props }) => (
  <button
    className={`flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium transition-all ${className}`}
    {...props}
  >
    {children}
  </button>
);

// ─── Pagination ───────────────────────────────────────────────────────────────
import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi";

export const Pagination = ({ pagination, onPageChange }) => {
  if (pagination.pages <= 1) return null;
  return (
    <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
      <span>
        Page <span className="font-semibold text-slate-700">{pagination.page}</span> of{" "}
        <span className="font-semibold text-slate-700">{pagination.pages}</span>
        {" "}· {pagination.total} records
      </span>
      <div className="flex gap-1.5">
        <button
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition text-xs"
        >
          <HiOutlineChevronLeft className="text-xs" /> Prev
        </button>
        <button
          disabled={pagination.page >= pagination.pages}
          onClick={() => onPageChange(pagination.page + 1)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition text-xs"
        >
          Next <HiOutlineChevronRight className="text-xs" />
        </button>
      </div>
    </div>
  );
};

// ─── Modal Shell ─────────────────────────────────────────────────────────────
export const Modal = ({ title, subtitle, onClose, children, footer, maxWidth = "max-w-2xl" }) => (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
    <div className={`bg-white rounded-xl w-full ${maxWidth} shadow-xl border border-slate-200 my-8`}>
      {/* Modal Header */}
      <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg ml-4 transition"
        >
          <HiOutlineX className="text-base" />
        </button>
      </div>

      {/* Modal Body */}
      <div className="px-6 py-5 space-y-4">
        {children}
      </div>

      {/* Modal Footer */}
      {footer && (
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  </div>
);

// ─── Section Divider ─────────────────────────────────────────────────────────
export const SectionLabel = ({ children }) => (
  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{children}</p>
);

// ─── Filter Bar ──────────────────────────────────────────────────────────────
export const FilterBar = ({ children }) => (
  <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    {children}
  </div>
);

// ─── Search Input ─────────────────────────────────────────────────────────────
import { HiOutlineSearch } from "react-icons/hi";

export const SearchInput = ({ value, onChange, placeholder = "Search..." }) => (
  <div className="relative">
    <HiOutlineSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition"
    />
  </div>
);

// ─── Empty State ─────────────────────────────────────────────────────────────
export const EmptyState = ({ icon: Icon, message }) => (
  <div className="py-16 text-center">
    {Icon && <Icon className="text-4xl text-slate-200 mx-auto mb-3" />}
    <p className="text-sm text-slate-400">{message}</p>
  </div>
);

// ─── Loading Row ─────────────────────────────────────────────────────────────
import { RiLoader4Line } from "react-icons/ri";

export const LoadingRow = ({ colSpan = 5 }) => (
  <tr>
    <td colSpan={colSpan} className="py-16 text-center">
      <RiLoader4Line className="text-2xl text-blue-400 animate-spin mx-auto mb-2" />
      <p className="text-xs text-slate-400">Loading...</p>
    </td>
  </tr>
);
