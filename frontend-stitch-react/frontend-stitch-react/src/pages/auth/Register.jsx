import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../../components/common/Icon';

export default function Register() {
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirmPassword: '', role: 'Volunteer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(form.username)) {
      setError('Tên đăng nhập chỉ chứa chữ cái, số, dấu gạch dưới và gạch ngang');
      return;
    }
    setLoading(true);
    try {
      await register({ username: form.username, name: form.fullName, email: form.email, password: form.password, role: form.role });
      navigate('/dang-nhap');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.Message || 'Đăng ký thất bại. Vui lòng thử lại.');
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
          <p className="text-on-surface-variant">Tạo tài khoản mới</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-soft border border-outline">
          {error && (
            <div className="mb-4 p-3 bg-error-container text-error rounded-xl text-sm flex items-center gap-2">
              <Icon name="error" size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-2 font-semibold">Họ và tên</label>
              <input name="fullName" value={form.fullName} onChange={handleChange} className="input-field" placeholder="Nguyễn Văn A" required />
            </div>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-2 font-semibold">Tên đăng nhập</label>
              <input name="username" value={form.username} onChange={handleChange} className="input-field" placeholder="nguyenvana" required minLength={3} maxLength={50} />
              <p className="text-xs text-on-surface-variant mt-1">Chỉ chứa chữ cái, số, dấu gạch dưới (_) và gạch ngang (-)</p>
            </div>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-2 font-semibold">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="input-field" placeholder="email@example.com" required />
            </div>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-2 font-semibold">Vai trò</label>
              <select name="role" value={form.role} onChange={handleChange} className="input-field">
                <option value="Volunteer">Tình nguyện viên</option>
                <option value="Organizer">Nhà tổ chức</option>
                <option value="Sponsor">Nhà tài trợ</option>
              </select>
            </div>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-2 font-semibold">Mật khẩu</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} className="input-field" placeholder="••••••••" required minLength={6} />
            </div>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-2 font-semibold">Xác nhận mật khẩu</label>
              <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} className="input-field" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Đang xử lý...' : 'Đăng ký'}
            </button>
          </form>

          <p className="text-center text-sm text-on-surface-variant mt-6">
            Đã có tài khoản?{' '}
            <Link to="/dang-nhap" className="text-primary font-semibold hover:underline">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  );
}