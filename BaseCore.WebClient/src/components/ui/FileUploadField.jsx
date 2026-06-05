import { useState } from 'react';
import { uploadApi } from '../../services/api';

export default function FileUploadField({ value, onChange, label = 'File dinh kem' }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await uploadApi.uploadFile(file);
      onChange(response.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Upload that bai');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  if (value?.url) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-warmink-2">{label}</p>
        <div className="flex items-center gap-2 rounded-lg border border-warmborder bg-surface-2 p-2">
          <i className="fa-solid fa-file text-warmink-2" />
          <span className="min-w-0 flex-1 truncate text-sm text-warmink-2">{value.name}</span>
          <span className="text-xs text-warmink-3">{Math.max(1, Math.round((value.size || 0) / 1024))} KB</span>
          <button type="button" onClick={() => onChange(null)} className="text-red-500 hover:text-red-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-warmink-2">{label}</p>
      <label className="block cursor-pointer rounded-lg border-2 border-dashed border-warmborder p-3 text-center text-sm text-warmink-2 hover:border-primary-400 hover:text-primary-600">
        <input type="file" onChange={handleFile} className="hidden" disabled={uploading} />
        <i className="fa-solid fa-paperclip mr-2 text-warmink-3" />
        {uploading ? 'Dang tai...' : 'Chon file PDF, DOCX, anh - toi da 10MB'}
      </label>
    </div>
  );
}
