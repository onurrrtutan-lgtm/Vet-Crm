import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { authAPI } from "../lib/api";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearAuth = () => {
    localStorage.removeItem("vetflow_token");
    localStorage.removeItem("vetflow_user");
    setUser(null);
  };

  const checkAuth = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("vetflow_token");
    const savedUser = localStorage.getItem("vetflow_user");

    // token yoksa direkt bitir
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    // hızlı UI için: saved user varsa anında set et
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // ignore
      }
    }

    // gerçek doğrulama
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
      localStorage.setItem("vetflow_user", JSON.stringify(response.data));
    } catch (e) {
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { access_token, user: userData } = response.data;

    localStorage.setItem("vetflow_token", access_token);
    localStorage.setItem("vetflow_user", JSON.stringify(userData));
    setUser(userData);

    return userData;
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    const { access_token, user: userData } = response.data;

    localStorage.setItem("vetflow_token", access_token);
    localStorage.setItem("vetflow_user", JSON.stringify(userData));
    setUser(userData);

    return userData;
  };

  const googleAuth = async (sessionId) => {
    const response = await authAPI.googleAuth(sessionId);
    const { access_token, user: userData } = response.data;

    localStorage.setItem("vetflow_token", access_token);
    localStorage.setItem("vetflow_user", JSON.stringify(userData));
    setUser(userData);

    return userData;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // ignore
    }
    clearAuth();
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      googleAuth,
      logout,
      isAuthenticated: !!user,
      refreshAuth: checkAuth,
    }),
    [user, loading, checkAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
