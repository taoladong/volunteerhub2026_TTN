import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, authStorage } from '../services/api';

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

  useEffect(() => {
    const token = authStorage.getToken();
    const storedUser = authStorage.getUser();

    if (token && storedUser) {
      setUser(storedUser);
      setLoading(false);
      return;
    }

    if (token) {
      authApi
        .me()
        .then((response) => {
          const currentUser = response.data;
          authStorage.setAuth({ token, user: currentUser });
          setUser(currentUser);
        })
        .catch(() => {
          authStorage.clear();
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });

      return;
    }

    if (storedUser) {
      authStorage.clear();
    }

    setLoading(false);
  }, []);

  const login = async (identifier, password) => {
    try {
      const response = await authApi.login(identifier, password);
      const payload = response.data;
      const token = payload?.token || payload?.accessToken;

      if (!token) {
        throw new Error('API đăng nhập không trả về token.');
      }

      authStorage.setAuth({
        token,
        refreshToken: payload?.refreshToken,
        user: payload?.user,
      });
      setUser(payload?.user || null);

      return { success: true, user: payload?.user || null };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Đăng nhập thất bại',
      };
    }
  };

  const logout = async () => {
    const refreshToken = authStorage.getRefreshToken();
    authStorage.clear();
    setUser(null);

    try {
      await authApi.logout(refreshToken);
    } catch {
      // Ignore remote logout failures after local session cleanup.
    }
  };

  const isVolunteer = () => user?.role === 'Volunteer';
  const isOrganizer = () => user?.role === 'Organizer';
  const isSponsor = () => user?.role === 'Sponsor';
  const isAdmin = () => user?.role === 'Admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
        isVolunteer,
        isOrganizer,
        isSponsor,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
