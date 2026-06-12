import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, authStorage } from '../services/api';

const AuthContext = createContext(null);

const getAvatarValue = (source = {}) => (
  source?.avatarUrl
  || source?.avatar
  || source?.imageUrl
  || source?.photoUrl
  || source?.profileImageUrl
  || source?.profile?.avatarUrl
  || source?.profile?.avatar
  || source?.profile?.imageUrl
  || ''
);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(authStorage.getUser());
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  const fetchUser = useCallback(async () => {
    const token = authStorage.getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await authApi.me();
      const rawData = res.data?.user || res.data;
      const userData = {
        id: rawData.userId || rawData.id,
        userId: rawData.userId || rawData.id,
        email: rawData.email,
        fullName: rawData.fullName || rawData.name,
        roles: rawData.roles || [],
        role: rawData.roles?.[0] || 'Volunteer'
      };

      // Chỉ áp dụng kết quả /auth/me nếu token hiện tại vẫn là token đã dùng khi request bắt đầu.
      // Tránh request cũ ghi đè hoặc đăng xuất nhầm session mới sau khi user vừa đăng nhập lại.
      if (authStorage.getToken() === token) {
        setUser((prev) => {
          const storedUser = authStorage.getUser() || {};
          const nextUser = { ...storedUser, ...(prev || {}), ...userData };
          const preservedAvatar = getAvatarValue(userData) || getAvatarValue(prev) || getAvatarValue(storedUser);

          if (preservedAvatar) {
            nextUser.avatarUrl = preservedAvatar;
            nextUser.avatar = preservedAvatar;
          }

          authStorage.setAuth({ user: nextUser });
          return nextUser;
        });
      }
    } catch (error) {
      const status = error?.response?.status;
      const currentToken = authStorage.getToken();

      // Không tự đăng xuất khi lỗi mạng/timeout/backend tạm thời không phản hồi.
      // Không clear session với 404 vì trong môi trường gateway/microservice,
      // 404 có thể là route/service chưa sẵn sàng hoặc gateway chưa nạp cấu hình mới,
      // không nhất thiết là token/session sai. Chỉ clear khi backend xác nhận
      // token/session không còn hợp lệ bằng 401/403 và lỗi thuộc token hiện tại.
      if ((status === 401 || status === 403) && currentToken === token) {
        authStorage.clear();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  const login = async (identifier, password) => {
    const res = await authApi.login(identifier, password);
    const data = res.data;
    const token = data.accessToken || data.token;
    const refreshToken = data.refreshToken;
    const userData = {
      id: data.userId,
      userId: data.userId,
      email: data.email,
      fullName: data.fullName,
      roles: data.roles || [],
      role: data.roles?.[0] || 'Volunteer'
    };
    authStorage.setAuth({ token, refreshToken, user: userData });
    setUser(userData);
    return userData;
  };

  const register = async (data) => {
    const res = await authApi.register(data);
    const responseData = res.data;
    const token = responseData.accessToken || responseData.token;
    const refreshToken = responseData.refreshToken;
    const userData = {
      id: responseData.userId,
      userId: responseData.userId,
      email: responseData.email,
      fullName: responseData.fullName,
      roles: responseData.roles || [],
      role: responseData.roles?.[0] || 'Volunteer'
    };
    if (token) {
      authStorage.setAuth({ token, refreshToken, user: userData });
      setUser(userData);
    }
    return responseData;
  };

  const updateUser = (patch) => {
    setUser((prev) => {
      const nextUser = { ...(prev || {}), ...patch };
      authStorage.setAuth({ user: nextUser });
      return nextUser;
    });
  };

  const logout = async () => {
    try {
      const refreshToken = authStorage.getRefreshToken();
      await authApi.logout(refreshToken);
    } catch {
      // ignore
    } finally {
      authStorage.clear();
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    updateUser,
    logout,
    refreshUser: fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;