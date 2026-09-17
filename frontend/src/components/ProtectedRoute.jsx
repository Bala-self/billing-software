import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ permission }) => {
  const { isAuthenticated, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#111]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  if (permission && !hasPermission(permission)) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-gray-600">
        Access denied
      </div>
    );
  }
  return <Outlet />;
};

export default ProtectedRoute;
