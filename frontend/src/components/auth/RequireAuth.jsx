import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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

  const setSession = useCallback((token, userObj) => {
    if (token) localStorage.setItem("vetflow_token", token);
    if (userObj) localStorage.setItem("vetflow_user", JSON.stringify(userObj));
    if (!userObj) localStorage.removeItem("vetflow_user");
    setUser(userObj || null);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem("vetflow_token");
    localStorage.removeItem("vetflow_user");
    setUser(null);
  }, []);

  const fetchMe = useCallback(async () => {
    const meRes = await authAPI.getMe();
    const me = meRes.data;
    localStorage.setItem("vetflow_user", JSON.stringify(me));
    setUser(me);
    return me;
  }, []);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("vetflow_token");
    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }

    try {
      // localde user varsa bile, prod’da token geçerli mi diye doğrulayalım
      await fetchMe();
    } catch (e) {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [fetchMe, clearSession]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });

    const accessToken = res.data?.access_token || res.data?.token;
    const userData = res.data?.user || res.data?.data?.user || null;

    if (!accessToken) {
      throw new Error("Login succeeded but access_token not found in response");
    }

    // token'ı yaz
    localStorage.setItem("vetflow_token", accessToken);

    // user dönmediyse /me çağır
    if (userData) {
      setSession(accessToken, userData);
      return userData;
    }

    const me = await fetchMe();
    return me;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);

    const accessToken = res.data?.access_token || res.data?.token;
    const userData = res.data?.user || res.data?.data?.user || null;

    if (!accessToken) {
      throw new Error("Register succeeded but access_token not found in response");
    }

    localStorage.setItem("vetflow_token", accessToken);

    if (userData) {
      setSession(accessToken, userData);
      return userData;
    }

    const me = await fetchMe();
    return me;
  };

  const googleAuth = async (sessionId) => {
    const res = await authAPI.googleAuth(sessionId);

    const accessToken = res.data?.access_token || res.data?.token;
    const userData = res.data?.user || res.data?.data?.user || null;

    if (!accessToken) {
      throw new Error("Google auth succeeded but access_token not found in response");
    }

    localStorage.setItem("vetflow_token", accessToken);

    if (userData) {
      setSession(accessToken, userData);
      return userData;
    }

    const me = await fetchMe();
    return me;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (e) {
      // ignore
    }
    clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        googleAuth,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
