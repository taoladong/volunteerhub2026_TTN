import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasAllowedRole } from '../utils/navigation';
import Loading from './common/Loading';

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/dang-nhap" replace />;
  if (!hasAllowedRole(user, roles)) return <Navigate to="/" replace />;

  return children;
}