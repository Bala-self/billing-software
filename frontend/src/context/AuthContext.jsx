import React, { createContext, useContext, useState, useEffect } from "react";
import API from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      if (!localStorage.getItem("token")) {
        setLoading(false);
        return;
      }

      try {
        const response = await API.get("/auth/me");
        const { user: userData, business: businessData } = response.data.data;
        setUser(userData);
        setBusiness(businessData);
        setPermissions(userData?.permissions || []);
      } catch {
        localStorage.removeItem("token");
        setUser(null);
        setBusiness(null);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (email, password) => {
    const response = await API.post("/auth/login", { email, password });
    const {
      user: userData,
      business: businessData,
      accessToken,
    } = response.data.data;
    localStorage.setItem("token", accessToken);
    setUser(userData);
    setBusiness(businessData);
    setPermissions(userData?.permissions || []);
    return userData;
  };

  const logout = async () => {
    try {
      await API.post("/auth/logout");
    } catch (error) {
      void error;
    }
    localStorage.removeItem("token");
    localStorage.removeItem("e2b-traffic-access-token");
    setUser(null);
    setBusiness(null);
    setPermissions([]);
    window.location.href = "/";
  };

  const hasPermission = (permissionKey) => {
    return (
      permissions.includes(permissionKey) ||
      user?.role === "Admin" ||
      user?.role === "Super Admin"
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        permissions,
        loading,
        isAuthenticated: Boolean(user),
        login,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
