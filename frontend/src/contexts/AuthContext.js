import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem('vetflow_token');
    const savedUser = localStorage.getItem('vetflow_user');
    
    if (token && savedUser) {
      try {
        const response = await authAPI.getMe();
        setUser(response.data);
        localStorage.setItem('vetflow_user', JSON.stringify(response.data));
      } catch (error) {
        localStorage.removeItem('vetflow_token');
        localStorage.removeItem('vetflow_user');
        setUser(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('vetflow_token', access_token);
    localStorage.setItem('vetflow_user', JSON.stringify(userData));
    setUser(userData);
    
    return userData;
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('vetflow_token', access_token);
    localStorage.setItem('vetflow_user', JSON.stringify(userData));
    setUser(userData);
    
    return userData;
  };

  const googleAuth = async (sessionId) => {
    const response = await authAPI.googleAuth(sessionId);
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('vetflow_token', access_token);
    localStorage.setItem('vetflow_user', JSON.stringify(userData));
    setUser(userData);
    
    return userData;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Ignore logout errors
    }
    localStorage.removeItem('vetflow_token');
    localStorage.removeItem('vetflow_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      googleAuth,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};
