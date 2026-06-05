import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PublicLayout from './PublicLayout';
import MainLayout from './MainLayout';

/**
 * Layout thích nghi cho các trang vừa công khai vừa dùng nội bộ
 * (vd: /events, /events/:id). Khi đã đăng nhập → app-shell (MainLayout)
 * để giữ sidebar; khi là khách → PublicLayout với header công khai.
 */
export default function SharedLayout({ children }) {
  const { isAuthenticated } = useAuth();
  // AppRoutes đã gate `loading` toàn cục bằng PageLoader nên ở đây chỉ cần xét isAuthenticated.
  return isAuthenticated ? <MainLayout>{children}</MainLayout> : <PublicLayout>{children}</PublicLayout>;
}
