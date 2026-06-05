import React, { useState, useEffect } from 'react';
import { skillApi } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';

const EMPTY = { name: '', category: '' };

export default function AdminSkills() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    skillApi.getAll()
      .then((r) => setSkills(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModal(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, category: s.category || '' });
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
    };

    if (!payload.name) {
      alert('Vui lòng nhập tên kỹ năng.');
      return;
    }

    if (payload.name.length > 100 || payload.category.length > 100) {
      alert('Tên kỹ năng và danh mục tối đa 100 ký tự.');
      return;
    }

    setSaving(true);

    try {
      if (editing) {
        const r = await skillApi.update(editing.id, payload);
        setSkills((prev) => prev.map((s) => (s.id === editing.id ? r.data : s)));
      } else {
        const r = await skillApi.create(payload);
        setSkills((prev) => [...prev, r.data]);
      }
      closeModal();
    } catch (err) {
      alert(err.response?.data?.message || (editing ? 'Cập nhật thất bại' : 'Tạo kỹ năng thất bại'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Xóa kỹ năng "${s.name}"?`)) return;

    try {
      await skillApi.delete(s.id);
      setSkills((prev) => prev.filter((x) => x.id !== s.id));
    } catch (err) {
      alert(err.response?.data?.message || 'Xóa thất bại');
    }
  };

  const filtered = search ? skills.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())) : skills;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold" style={{ color: '#181d26' }}>Quản lý kỹ năng</h1>
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm..."
            className="input-field w-48 text-sm"
          />
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <i className="fa-solid fa-plus" /> Thêm kỹ năng
          </button>
        </div>
      </div>

      <div className="card p-4" style={{ background: '#f0f5ff', borderColor: '#b8d0ff' }}>
        <p className="text-sm" style={{ color: 'rgba(4,14,32,0.65)' }}>
          Tổng số kỹ năng: <span className="font-bold" style={{ color: '#1b61c9' }}>{skills.length}</span>
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <i className="fa-solid fa-wrench text-4xl text-gray-300 mb-3 block" />
          <p style={{ color: 'rgba(4,14,32,0.50)' }}>{search ? 'Không tìm thấy kỹ năng phù hợp' : 'Chưa có kỹ năng nào'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => (
            <div key={s.id} className="card p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(27,97,201,0.10)' }}>
                <i className="fa-solid fa-wrench text-sm" style={{ color: '#1b61c9' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm" style={{ color: '#181d26' }}>{s.name}</h3>
                {s.category && (
                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'rgba(4,14,32,0.50)' }}>{s.category}</p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => openEdit(s)}
                  className="w-7 h-7 rounded flex items-center justify-center transition-colors"
                  style={{ color: '#1b61c9' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(27,97,201,0.10)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  title="Sửa"
                >
                  <i className="fa-solid fa-pen text-xs" />
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  className="w-7 h-7 rounded flex items-center justify-center transition-colors"
                  style={{ color: '#dc2626' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.09)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  title="Xóa"
                >
                  <i className="fa-solid fa-trash text-xs" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={closeModal} title={editing ? 'Sửa kỹ năng' : 'Thêm kỹ năng mới'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#181d26' }}>Tên kỹ năng *</label>
            <input
              type="text"
              value={form.name}
              onInput={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              maxLength={100}
              className="input-field"
              placeholder="VD: Sơ cứu y tế"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#181d26' }}>Danh mục</label>
            <input
              type="text"
              value={form.category}
              onInput={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              maxLength={100}
              className="input-field"
              placeholder="VD: Y tế, Môi trường..."
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary btn-sm">Hủy</button>
            <button type="submit" disabled={saving} className="btn-primary btn-sm flex items-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editing ? 'Lưu thay đổi' : 'Tạo kỹ năng'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
