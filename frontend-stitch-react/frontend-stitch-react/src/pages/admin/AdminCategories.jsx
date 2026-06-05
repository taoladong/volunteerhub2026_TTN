import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { categoryApi, eventCategoryApi, skillApi } from '../../services/api';
import Loading from '../../components/common/Loading';
import { Alert, EmptyState, PageHeader, StatusBadge, TabBar, getErrorMessage, unwrap } from '../../components/common/CommonUI';

const modules = {
  event: { label: 'Danh mục sự kiện', api: eventCategoryApi, icon: 'category' },
  skill: { label: 'Kỹ năng hệ thống', api: skillApi, icon: 'psychology' },
  generic: { label: 'Categories generic', api: categoryApi, icon: 'folder' },
};

const emptyForm = { name: '', description: '', code: '' };

export default function AdminCategories() {
  const [active, setActive] = useState('event');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const current = useMemo(() => modules[active], [active]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await current.api.getAll();
      setItems(unwrap(res));
    } catch (err) {
      setError(getErrorMessage(err, `Không tải được ${current.label}`));
    } finally {
      setLoading(false);
    }
  }, [current]);

  useEffect(() => { load(); }, [load]);

  const reset = () => {
    setForm(emptyForm);
    setEditing(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { ...form };
      if (editing) await current.api.update(editing.id, payload);
      else await current.api.create(payload);
      reset();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Không lưu được dữ liệu'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Xóa "${item.name || item.title}"?`)) return;
    setBusy(true);
    try {
      await current.api.delete(item.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Không xóa được dữ liệu'));
    } finally {
      setBusy(false);
    }
  };

  const edit = (item) => {
    setEditing(item);
    setForm({ name: item.name || item.title || '', description: item.description || '', code: item.code || '' });
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={current.icon} title="Quản lý danh mục & kỹ năng" subtitle="CRUD danh mục sự kiện, kỹ năng hệ thống và generic categories." />
      {error && <Alert type="error">{error}</Alert>}
      <TabBar tabs={Object.entries(modules).map(([value, cfg]) => ({ value, label: cfg.label }))} active={active} onChange={(value) => { setActive(value); reset(); }} />

      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        <form onSubmit={submit} className="bg-white rounded-3xl shadow-soft border border-outline p-6 space-y-4">
          <h2 className="text-title-md font-bold text-on-surface">{editing ? 'Cập nhật' : 'Tạo mới'} {current.label}</h2>
          <div>
            <label className="text-label-sm font-medium text-on-surface-variant mb-1 block">Tên</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          </div>
          <div>
            <label className="text-label-sm font-medium text-on-surface-variant mb-1 block">Mã</label>
            <input className="input-field" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="Tùy chọn" />
          </div>
          <div>
            <label className="text-label-sm font-medium text-on-surface-variant mb-1 block">Mô tả</label>
            <textarea className="input-field min-h-28" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu'}</button>
            {editing && <button type="button" className="btn-secondary" onClick={reset}>Hủy sửa</button>}
          </div>
        </form>

        <div className="bg-white rounded-3xl shadow-soft border border-outline p-5">
          {loading ? <Loading /> : items.length === 0 ? <EmptyState icon={current.icon} title="Chưa có dữ liệu" /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-surface-variant/50">
                  <tr>
                    <th className="text-left p-4 text-label-sm uppercase tracking-wider text-on-surface-variant">Tên</th>
                    <th className="text-left p-4 text-label-sm uppercase tracking-wider text-on-surface-variant">Mã/Trạng thái</th>
                    <th className="text-left p-4 text-label-sm uppercase tracking-wider text-on-surface-variant">Mô tả</th>
                    <th className="text-right p-4 text-label-sm uppercase tracking-wider text-on-surface-variant">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-outline hover:bg-primary-container/10">
                      <td className="p-4 font-bold text-on-surface">{item.name || item.title || '—'}</td>
                      <td className="p-4"><StatusBadge status={item.isActive === false ? 'Inactive' : 'Active'}>{item.code || (item.isActive === false ? 'Inactive' : 'Active')}</StatusBadge></td>
                      <td className="p-4 text-body-sm text-on-surface-variant">{item.description || '—'}</td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <button className="btn-secondary !py-2 !px-3" onClick={() => edit(item)}>Sửa</button>
                          <button className="btn-danger !py-2 !px-3" onClick={() => remove(item)}>Xóa</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
