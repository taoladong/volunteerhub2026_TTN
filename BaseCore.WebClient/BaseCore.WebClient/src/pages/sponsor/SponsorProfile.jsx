import React, { useEffect, useState } from 'react';
import { sponsorProfileApi } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ImageUploadField from '../../components/ui/ImageUploadField';

export default function SponsorProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [form, setForm] = useState({
    organizationName: '',
    representativeName: '',
    contactEmail: '',
    phone: '',
    website: '',
    logoUrl: '',
    description: '',
  });

  useEffect(() => {
    sponsorProfileApi.get()
      .then((res) => {
        const p = res.data;
        setForm({
          organizationName: p.organizationName || '',
          representativeName: p.representativeName || '',
          contactEmail: p.contactEmail || '',
          phone: p.phone || '',
          website: p.website || '',
          logoUrl: p.logoUrl || '',
          description: p.description || '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      await sponsorProfileApi.update(form);
      setMsg({ type: 'success', text: 'Cập nhật hồ sơ thành công!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Cập nhật thất bại' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Hồ sơ nhà tài trợ</h1>
        <p className="text-sm text-gray-500 mt-0.5">Cập nhật thông tin tổ chức và liên hệ của bạn.</p>
      </div>

      {msg.text && (
        <div className={`p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên tổ chức</label>
          <input value={form.organizationName} onChange={(e) => setForm((f) => ({ ...f, organizationName: e.target.value }))} className="input-field" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Người đại diện</label>
            <input value={form.representativeName} onChange={(e) => setForm((f) => ({ ...f, representativeName: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email liên hệ</label>
            <input type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} className="input-field" />
          </div>
        </div>
        <ImageUploadField
          label="Logo tổ chức"
          value={form.logoUrl}
          onChange={(url) => setForm((f) => ({ ...f, logoUrl: url }))}
          helper="Upload logo hoặc ảnh đại diện tổ chức."
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
          <textarea rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input-field resize-none" />
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Lưu hồ sơ
          </button>
        </div>
      </form>
    </div>
  );
}
