import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../../components/common/Icon';
import { getDefaultRouteByRole } from '../../utils/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(getDefaultRouteByRole(user));
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Icon name="volunteer_activism" className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-extrabold text-primary font-headline">VolunteerHub</h1>
          </div>
          <p className="text-on-surface-variant">Đăng nhập để tiếp tục</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-soft border border-outline">
          {error && (
            <div className="mb-4 p-3 bg-error-container text-error rounded-xl text-sm flex items-center gap-2">
              <Icon name="error" size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-2 font-semibold">Email hoặc tên đăng nhập</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="email@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-2 font-semibold">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>
          </form>

          <p className="text-center text-sm text-on-surface-variant mt-6">
            Chưa có tài khoản?{' '}
            <Link to="/dang-ky" className="text-primary font-semibold hover:underline">Đăng ký ngay</Link>
          </p>
        </div>
      </div>
    </div>
  );
}