import React, { useState, useEffect } from 'react';
import { eventCategoryApi } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState({});

  useEffect(() => {
    eventCategoryApi.getAll()
      .then((r) => setCategories(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', description: '' });
    setModal(true);
  };

  const openEdit = (c) => {
    setEditItem(c);
    setForm({ name: c.name, description: c.description || '' });
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
    };

    if (!payload.name) {
      alert('Vui lòng nhập tên danh mục.');
      return;
    }

    if (payload.name.length > 100 || payload.description.length > 500) {
      alert('Tên danh mục tối đa 100 ký tự, mô tả tối đa 500 ký tự.');
      return;
    }

    setSaving(true);

    try {
      if (editItem) {
        await eventCategoryApi.update(editItem.id, payload);
        setCategories((prev) => prev.map((c) => (c.id === editItem.id ? { ...c, ...payload } : c)));
      } else {
        const r = await eventCategoryApi.create(payload);
        setCategories((prev) => [...prev, r.data]);
      }
      setModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa danh mục này?')) return;
    setDeleting((prev) => ({ ...prev, [id]: true }));

    try {
      await eventCategoryApi.delete(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Xóa thất bại');
    } finally {
      setDeleting((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Danh mục sự kiện</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <i className="fa-solid fa-plus" /> Thêm danh mục
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="card p-12 text-center">
          <i className="fa-solid fa-tags text-4xl text-gray-300 mb-3 block" />
          <p className="text-gray-500">Chưa có danh mục nào</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">Tên danh mục</th>
                <th className="text-left px-4 py-3">Mô tả</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((c) => (
                <tr key={c.id} className="odd:bg-gray-50/50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{c.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{c.description || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(c)} className="btn-secondary btn-sm text-xs flex items-center gap-1">
                        <i className="fa-solid fa-pen" /> Sửa
                      </button>
                      <button onClick={() => handleDelete(c.id)} disabled={deleting[c.id]} className="btn-danger btn-sm text-xs flex items-center gap-1">
                        {deleting[c.id] ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <i className="fa-solid fa-trash" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editItem ? 'Chỉnh sửa danh mục' : 'Thêm danh mục'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên danh mục *</label>
            <input
              type="text"
              value={form.name}
              onInput={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              maxLength={100}
              className="input-field"
              placeholder="VD: Môi trường"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea
              rows={3}
              value={form.description}
              onInput={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              maxLength={500}
              className="input-field resize-none"
              placeholder="Mô tả ngắn..."
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editItem ? 'Lưu thay đổi' : 'Tạo danh mục'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
