/**
 * App.jsx - Optimized with Lazy Loading
 * For 1 year MERN dev: simple, fast
 *
 * Performance Optimizations from guide:
 * 1. Lazy loading pages - don't load everything on startup
 *    Load only the page employee opens
 * 2. Suspense fallback - small loading indicator
 * 3. ProtectedRoute for auth
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy load pages - don't load all at once, load when needed
// This reduces initial bundle size and makes app faster
const Login = lazy(() => import("./pages/login"));
const Home = lazy(() => import("./pages/home"));
const Billing = lazy(() => import("./pages/Billing"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Quotations = lazy(() => import("./pages/Quotations"));
const Sales = lazy(() => import("./pages/Sales"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Products = lazy(() => import("./pages/Products"));
const Customers = lazy(() => import("./pages/Customers"));
const Employees = lazy(() => import("./pages/Employees"));
const Attendance = lazy(() => import("./pages/Attendance"));
const AttendanceHistory = lazy(() => import("./pages/AttendanceHistory"));
const AttendanceReport = lazy(() => import("./pages/AttendanceReport"));
const Users = lazy(() => import("./pages/Users"));
const Settings = lazy(() => import("./pages/Settings"));

// Small loading component - don't freeze whole page
const PageLoader = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Login />} />

            {/* Protected - login required */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Home />} />
              <Route
                path="/billing"
                element={<ProtectedRoute permission="sales.create" />}
              >
                <Route index element={<Billing />} />
              </Route>
              <Route
                path="/invoices"
                element={<ProtectedRoute permission="invoice.view" />}
              >
                <Route index element={<Invoices />} />
              </Route>
              <Route
                path="/quotations"
                element={<ProtectedRoute permission="quotation.manage" />}
              >
                <Route index element={<Quotations />} />
              </Route>
              <Route
                path="/sales"
                element={<ProtectedRoute permission="sales.view" />}
              >
                <Route index element={<Sales />} />
              </Route>
              <Route
                path="/purchases"
                element={<ProtectedRoute permission="purchases.view" />}
              >
                <Route index element={<Purchases />} />
              </Route>
              <Route
                path="/products"
                element={<ProtectedRoute permission="products.view" />}
              >
                <Route index element={<Products />} />
              </Route>
              <Route
                path="/customers"
                element={<ProtectedRoute permission="customers.view" />}
              >
                <Route index element={<Customers />} />
              </Route>
              <Route
                path="/employees"
                element={<ProtectedRoute permission="employees.view" />}
              >
                <Route index element={<Employees />} />
              </Route>
              <Route
                path="/attendance"
                element={<ProtectedRoute permission="attendance.view" />}
              >
                <Route index element={<Attendance />} />
              </Route>
              <Route
                path="/attendance-history"
                element={<ProtectedRoute permission="attendance.view" />}
              >
                <Route index element={<AttendanceHistory />} />
              </Route>
              <Route
                path="/attendance-reports"
                element={<ProtectedRoute permission="attendance.reports" />}
              >
                <Route index element={<AttendanceReport />} />
              </Route>
              <Route
                path="/users"
                element={<ProtectedRoute permission="users.manage" />}
              >
                <Route index element={<Users />} />
              </Route>
              <Route
                path="/settings"
                element={<ProtectedRoute permission="settings.manage" />}
              >
                <Route index element={<Settings />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
