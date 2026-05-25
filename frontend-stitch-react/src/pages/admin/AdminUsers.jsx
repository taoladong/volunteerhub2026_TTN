import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = (keyword = '') => {
    setLoading(true);
    adminApi.getUsers({ search: keyword })
      .then(res => setUsers(Array.isArray(res.data) ? res.data : res.data?.items || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleStatus = async (id) => {
    await adminApi.toggleUserStatus(id);
    fetchUsers(search);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-headline-lg font-bold text-on-surface">Quản lý người dùng</h2>
        <p className="text-on-surface-variant">Xem, tìm kiếm và quản lý tài khoản người dùng.</p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers(search)}
            className="input-field pl-10"
            placeholder="Tìm theo tên, email..."
          />
        </div>
        <button onClick={() => fetchUsers(search)} className="btn-primary">Tìm kiếm</button>
      </div>

      {loading ? <Loading /> : (
        <div className="bg-white rounded-3xl shadow-soft border border-outline overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-variant/50">
                <tr>
                  <th className="px-6 py-4 text-label-sm text-on-surface-variant uppercase">Họ tên</th>
                  <th className="px-6 py-4 text-label-sm text-on-surface-variant uppercase">Email</th>
                  <th className="px-6 py-4 text-label-sm text-on-surface-variant uppercase">Vai trò</th>
                  <th className="px-6 py-4 text-label-sm text-on-surface-variant uppercase">Trạng thái</th>
                  <th className="px-6 py-4 text-label-sm text-on-surface-variant uppercase text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-primary-container/10 transition-colors">
                    <td className="px-6 py-4 font-medium text-on-surface">{user.fullName || '—'}</td>
                    <td className="px-6 py-4 text-on-surface-variant text-sm">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="bg-primary-container text-primary px-3 py-1 rounded-full text-label-sm font-bold">
                        {user.role || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-label-sm font-bold ${user.isActive !== false ? 'bg-success-container text-on-success-container' : 'bg-error-container text-error'}`}>
                        {user.isActive !== false ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleToggleStatus(user.id)} className="text-primary font-label text-label-md hover:underline">
                        {user.isActive !== false ? 'Khóa' : 'Mở khóa'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <div className="text-center py-12 text-on-surface-variant">Không tìm thấy người dùng nào.</div>
          )}
        </div>
      )}
    </div>
  );
}