import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';

const ROLE_MAP = {
  0: { key: 'Volunteer', label: 'Tình nguyện viên', className: 'bg-green-100 text-green-700' },
  1: { key: 'Organizer', label: 'Nhà tổ chức', className: 'bg-blue-100 text-blue-700' },
  2: { key: 'Sponsor', label: 'Nhà tài trợ', className: 'bg-yellow-100 text-yellow-700' },
  3: { key: 'Admin', label: 'Admin', className: 'bg-purple-100 text-purple-700' },
};

function RoleBadge({ userType, role }) {
  const mapped = ROLE_MAP[userType] || ROLE_MAP[role] || { label: role || `Loại ${userType}`, className: 'bg-gray-100 text-gray-600' };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${mapped.className}`}>
      {mapped.label}
    </span>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toggling, setToggling] = useState({});

  const buildParams = (p = 1, q = search) => ({
    page: p,
    pageSize: 15,
    search: q,
    ...(roleFilter !== '' ? { userType: Number(roleFilter) } : {}),
    ...(statusFilter !== '' ? { isActive: statusFilter === 'active' } : {}),
  });

  const load = (p = 1, q = search) => {
    setLoading(true);
    adminApi.getUsers(buildParams(p, q))
      .then((r) => {
        setUsers(r.data?.items || []);
        setTotalPages(r.data?.totalPages || 1);
        setPage(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1, search);
  }, [search, roleFilter, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const toggleStatus = async (user) => {
    if (user.userType === 3) return;
    setToggling((prev) => ({ ...prev, [user.id]: true }));
    try {
      await adminApi.toggleUserStatus(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u)));
    } catch (err) {
      alert(err.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setToggling((prev) => ({ ...prev, [user.id]: false }));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quản lý người dùng</h1>
          <p className="text-sm text-gray-500">Lọc theo vai trò, trạng thái và khóa/mở tài khoản khi cần.</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm tên, username, email..."
            className="input-field w-60 text-sm"
          />
          <button type="submit" className="btn-primary btn-sm">
            <i className="fa-solid fa-search" />
          </button>
        </form>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-field w-48 text-sm">
          <option value="">Tất cả vai trò</option>
          <option value="0">Tình nguyện viên</option>
          <option value="1">Nhà tổ chức</option>
          <option value="2">Nhà tài trợ</option>
          <option value="3">Admin</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-44 text-sm">
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Bị khóa</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : users.length === 0 ? (
        <div className="card p-12 text-center">
          <i className="fa-solid fa-users text-4xl text-gray-300 mb-3 block" />
          <p className="text-gray-500">Không tìm thấy người dùng</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left px-4 py-3">Người dùng</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Vai trò</th>
                <th className="text-left px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const displayName = u.name || u.userName || 'Người dùng';
                const isAdmin = u.userType === 3;

                return (
                  <tr key={u.id} className="odd:bg-gray-50/50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 text-primary-600 text-xs font-bold">
                          {displayName[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{displayName}</div>
                          <div className="text-xs text-gray-400">ID: {u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email || '-'}</td>
                    <td className="px-4 py-3"><RoleBadge userType={u.userType} role={u.role} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.isActive ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isAdmin ? (
                        <span className="text-xs text-gray-400">Được bảo vệ</span>
                      ) : (
                        <button
                          onClick={() => toggleStatus(u)}
                          disabled={toggling[u.id]}
                          className={`btn-sm text-xs flex items-center gap-1 mx-auto ${u.isActive ? 'btn-danger' : 'btn-primary'}`}
                        >
                          {toggling[u.id]
                            ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            : <i className={`fa-solid ${u.isActive ? 'fa-lock' : 'fa-lock-open'}`} />}
                          {u.isActive ? 'Khóa' : 'Mở khóa'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => load(p)} />
      )}
    </div>
  );
}
