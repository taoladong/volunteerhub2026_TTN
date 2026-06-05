import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { eventApi, eventCategoryApi, organizerVerificationApi, skillApi } from '../../services/api';
import ImageUploadField from '../../components/ui/ImageUploadField';

const LocationPickerMap = lazy(() => import('../../components/ui/LocationPickerMap'));

const INIT = {
  title: '',
  description: '',
  location: '',
  latitude: '',
  longitude: '',
  checkInRadiusKm: 0.5,
  startDate: '',
  endDate: '',
  minParticipants: 1,
  maxParticipants: 50,
  requiresKyc: false,
  categoryId: '',
  imageUrl: '',
  requiredSkillIds: '[]',
};

const STEPS = [
  { id: 'basic', title: 'Thông tin cơ bản', icon: 'fa-regular fa-pen-to-square' },
  { id: 'location', title: 'Địa điểm', icon: 'fa-solid fa-location-dot' },
  { id: 'time', title: 'Thời gian & số lượng', icon: 'fa-regular fa-clock' },
  { id: 'conditions', title: 'Điều kiện tham gia', icon: 'fa-solid fa-shield-heart' },
  { id: 'images', title: 'Ảnh', icon: 'fa-regular fa-image' },
  { id: 'preview', title: 'Xem trước & gửi duyệt', icon: 'fa-regular fa-eye' },
];

function Notice({ type = 'info', children }) {
  const styles = {
    info: 'border-blue-100 bg-blue-50 text-blue-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
    error: 'border-red-200 bg-red-50 text-red-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  };

  const icons = {
    info: 'fa-solid fa-circle-info',
    warn: 'fa-solid fa-triangle-exclamation',
    error: 'fa-solid fa-circle-exclamation',
    success: 'fa-solid fa-circle-check',
  };

  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${styles[type]}`}>
      <i className={`${icons[type]} mr-2`} />
      {children}
    </div>
  );
}

function FieldHint({ children }) {
  return <p className="mt-1 text-xs leading-5 text-gray-500">{children}</p>;
}

function CharacterCount({ value, max }) {
  return <span className="text-xs text-gray-400">{String(value || '').length}/{max}</span>;
}

function toDateTimeLocal(dt) {
  if (!dt) return '';
  const raw = String(dt);
  const date = new Date(raw.endsWith('Z') || raw.includes('+') ? raw : raw + 'Z');
  if (!Number.isFinite(date.getTime())) return '';
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

export default function EventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const draftKey = isEdit ? `event-draft-${id}` : 'event-draft-new';

  const [form, setForm] = useState(INIT);
  const [categories, setCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stepError, setStepError] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState('');
  const [addressSearching, setAddressSearching] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressError, setAddressError] = useState('');
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [verification, setVerification] = useState(null);
  const [checkingVerification, setCheckingVerification] = useState(!isEdit);
  const [currentStep, setCurrentStep] = useState(0);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(0);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftShifts, setDraftShifts] = useState([]);
  const [shiftDraft, setShiftDraft] = useState({
    name: '',
    startTime: '',
    endTime: '',
    maxVolunteers: 10,
    createChannel: true,
  });

  const selectedSkillIds = useMemo(() => {
    try {
      const value = JSON.parse(form.requiredSkillIds || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }, [form.requiredSkillIds]);

  const selectedSkills = useMemo(
    () => skills.filter((skill) => selectedSkillIds.includes(skill.id)),
    [skills, selectedSkillIds]
  );

  const selectedCategory = useMemo(
    () => categories.find((category) => String(category.id) === String(form.categoryId)),
    [categories, form.categoryId]
  );

  const numericMin = parseInt(form.minParticipants, 10);
  const numericMax = parseInt(form.maxParticipants, 10);
  const minMaxInvalid = Number.isInteger(numericMin) && Number.isInteger(numericMax) && numericMin > numericMax;
  const dateInvalid = form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate);
  const stepByField = {
    title: 0,
    description: 0,
    categoryId: 0,
    requiredSkillIds: 0,
    location: 1,
    latitude: 1,
    longitude: 1,
    checkInRadiusKm: 1,
    startDate: 2,
    endDate: 2,
    minParticipants: 2,
    maxParticipants: 2,
    requiresKyc: 3,
    imageUrl: 4,
  };

  const set = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setMaxUnlockedStep((step) => Math.min(step, stepByField[key] ?? step));
    setDraftSaved(false);
  };

  const setEventStartDate = (value) => {
    set('startDate', value);
    if (!form.endDate && value) {
      const end = new Date(value);
      end.setHours(end.getHours() + 2);
      setForm((previous) => ({ ...previous, startDate: value, endDate: toDateTimeLocal(end) }));
    }
  };

  const setQuickDuration = (hours) => {
    if (!form.startDate) return;
    const end = new Date(form.startDate);
    end.setHours(end.getHours() + hours);
    set('endDate', toDateTimeLocal(end));
  };

  const validateShiftDraft = (shift = shiftDraft) => {
    const eventStart = new Date(form.startDate);
    const eventEnd = new Date(form.endDate);
    const shiftStart = new Date(shift.startTime);
    const shiftEnd = new Date(shift.endTime);
    const maxVolunteers = Number(shift.maxVolunteers);

    if (!form.startDate || !form.endDate || dateInvalid) return 'Vui lòng nhập thời gian sự kiện hợp lệ trước khi thêm ca.';
    if (!shift.name.trim()) return 'Vui lòng nhập tên ca.';
    if (!Number.isFinite(shiftStart.getTime()) || !Number.isFinite(shiftEnd.getTime())) return 'Vui lòng nhập thời gian bắt đầu và kết thúc ca.';
    if (shiftEnd <= shiftStart) return 'Thời gian kết thúc ca phải sau thời gian bắt đầu.';
    if (shiftStart < eventStart || shiftEnd > eventEnd) return 'Ca làm việc phải nằm trong thời gian sự kiện.';
    if (!Number.isInteger(maxVolunteers) || maxVolunteers < 1 || maxVolunteers > 1000) return 'Số lượng tối đa của ca phải từ 1 đến 1000.';

    return '';
  };

  const addDraftShift = () => {
    const message = validateShiftDraft();
    if (message) {
      setStepError(message);
      return;
    }

    setDraftShifts((previous) => [...previous, {
      ...shiftDraft,
      id: Date.now(),
      name: shiftDraft.name.trim(),
      maxVolunteers: Number(shiftDraft.maxVolunteers),
    }]);
    setShiftDraft({ name: '', startTime: '', endTime: '', maxVolunteers: 10, createChannel: true });
    setStepError('');
    setDraftSaved(false);
  };

  const removeDraftShift = (shiftId) => {
    setDraftShifts((previous) => previous.filter((shift) => shift.id !== shiftId));
    setDraftSaved(false);
  };

  const validateAll = useCallback(() => {
    const latitude = form.latitude ? parseFloat(form.latitude) : null;
    const longitude = form.longitude ? parseFloat(form.longitude) : null;
    const checkInRadiusKm = parseFloat(form.checkInRadiusKm);
    const minParticipants = parseInt(form.minParticipants, 10);
    const maxParticipants = parseInt(form.maxParticipants, 10);

    if (!form.title.trim()) return 'Vui lòng nhập tên sự kiện.';
    if (!form.categoryId) return 'Vui lòng chọn danh mục sự kiện.';
    if (!form.startDate || !form.endDate) return 'Vui lòng nhập đầy đủ thời gian bắt đầu và kết thúc.';
    if (new Date(form.endDate) <= new Date(form.startDate)) return 'Thời gian kết thúc phải sau thời gian bắt đầu.';
    if (!form.location.trim()) return 'Vui lòng nhập địa điểm sự kiện.';
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return 'Vui lòng chọn vị trí trên bản đồ hoặc nhập đầy đủ latitude/longitude.';
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return 'Tọa độ không hợp lệ. Latitude phải từ -90 đến 90, longitude phải từ -180 đến 180.';
    }
    if (!Number.isFinite(checkInRadiusKm) || checkInRadiusKm <= 0 || checkInRadiusKm > 10) {
      return 'Bán kính điểm danh phải lớn hơn 0 và không vượt quá 10 km.';
    }
    if (!Number.isInteger(minParticipants) || minParticipants < 1) {
      return 'Số tình nguyện viên tối thiểu phải từ 1 trở lên.';
    }
    if (!Number.isInteger(maxParticipants) || maxParticipants < 1) {
      return 'Số tình nguyện viên tối đa phải từ 1 trở lên.';
    }
    if (minParticipants > maxParticipants) {
      return 'Số tối thiểu không được lớn hơn số tối đa.';
    }

    const invalidShift = draftShifts.find((shift) => validateShiftDraft(shift));
    if (!isEdit && invalidShift) {
      return `Ca "${invalidShift.name || 'chưa đặt tên'}" không hợp lệ hoặc nằm ngoài thời gian sự kiện.`;
    }

    return '';
  }, [draftShifts, form, isEdit, validateShiftDraft]);

  const validateCurrentStep = useCallback((stepIndex = currentStep) => {
    if (stepIndex === 0) {
      if (!form.title.trim()) return 'Vui lòng nhập tên sự kiện trước khi tiếp tục.';
      if (!form.categoryId) return 'Vui lòng chọn danh mục sự kiện.';
    }

    if (stepIndex === 1) {
      const latitude = form.latitude ? parseFloat(form.latitude) : null;
      const longitude = form.longitude ? parseFloat(form.longitude) : null;
      const checkInRadiusKm = parseFloat(form.checkInRadiusKm);
      if (!form.location.trim()) return 'Vui lòng nhập địa điểm sự kiện.';
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return 'Vui lòng chọn vị trí trên bản đồ hoặc nhập tọa độ.';
      }
      if (!Number.isFinite(checkInRadiusKm) || checkInRadiusKm <= 0 || checkInRadiusKm > 10) {
        return 'Bán kính điểm danh phải lớn hơn 0 và không vượt quá 10 km.';
      }
    }

    if (stepIndex === 2) {
      const minParticipants = parseInt(form.minParticipants, 10);
      const maxParticipants = parseInt(form.maxParticipants, 10);
      if (!form.startDate || !form.endDate) return 'Vui lòng nhập đầy đủ thời gian bắt đầu và kết thúc.';
      if (new Date(form.endDate) <= new Date(form.startDate)) return 'Thời gian kết thúc phải sau thời gian bắt đầu.';
      if (!Number.isInteger(minParticipants) || minParticipants < 1) return 'Số tối thiểu phải từ 1 trở lên.';
      if (!Number.isInteger(maxParticipants) || maxParticipants < 1) return 'Số tối đa phải từ 1 trở lên.';
      if (minParticipants > maxParticipants) return 'Số tối thiểu không được lớn hơn số tối đa.';
    }

    return '';
  }, [currentStep, form]);

  const reverseGeocode = useCallback(async (latitude, longitude) => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setReverseGeocoding(true);
    setAddressError('');
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        lat: String(lat),
        lon: String(lng),
        'accept-language': 'vi',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
      if (!response.ok) throw new Error('reverse failed');
      const result = await response.json();
      const label = result?.display_name || `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
      setForm((previous) => ({ ...previous, location: label }));
      setAddressSuggestions([]);
      setLocationNote('Đã cập nhật địa chỉ theo vị trí được chọn trên bản đồ.');
    } catch {
      setAddressError('Đã cập nhật tọa độ nhưng chưa lấy được địa chỉ tương ứng.');
    } finally {
      setReverseGeocoding(false);
    }
  }, []);

  const setMapLocation = useCallback(({ latitude, longitude }) => {
    setForm((previous) => ({ ...previous, latitude, longitude }));
    setMaxUnlockedStep((step) => Math.min(step, 1));
    setDraftSaved(false);
    reverseGeocode(latitude, longitude);
  }, [reverseGeocode]);

  const searchAddress = useCallback(async (query) => {
    const normalizedQuery = query.trim();
    setAddressError('');
    setAddressSuggestions([]);

    if (normalizedQuery.length < 3) return;

    setAddressSearching(true);
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        q: normalizedQuery,
        limit: '5',
        countrycodes: 'vn',
        addressdetails: '1',
        'accept-language': 'vi',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
      if (!response.ok) throw new Error('search failed');
      const results = await response.json();
      setAddressSuggestions((results || []).map((item) => ({
        id: item.place_id,
        label: item.display_name,
        latitude: Number(item.lat).toFixed(6),
        longitude: Number(item.lon).toFixed(6),
      })));
      if (!results?.length) {
        setAddressError('Không tìm thấy địa chỉ phù hợp. Bạn vẫn có thể click trực tiếp trên bản đồ.');
      }
    } catch {
      setAddressError('Không tìm được gợi ý lúc này. Hãy thử lại hoặc chọn trực tiếp trên bản đồ.');
    } finally {
      setAddressSearching(false);
    }
  }, []);

  const selectAddressSuggestion = (suggestion) => {
    setForm((previous) => ({
      ...previous,
      location: suggestion.label,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    }));
    setMaxUnlockedStep((step) => Math.min(step, 1));
    setDraftSaved(false);
    setAddressSuggestions([]);
    setAddressError('');
    setLocationNote('Đã chọn địa chỉ gợi ý và cập nhật vị trí trên bản đồ.');
  };

  const toggleSkill = (skillId) => {
    const next = selectedSkillIds.includes(skillId)
      ? selectedSkillIds.filter((value) => value !== skillId)
      : [...selectedSkillIds, skillId];
    set('requiredSkillIds', JSON.stringify(next));
  };

  useEffect(() => {
    eventCategoryApi.getAll().then((response) => setCategories(response.data || [])).catch(() => {});
    skillApi.getAll().then((response) => setSkills(response.data || [])).catch(() => {});

    if (!isEdit) {
      const rawDraft = localStorage.getItem(draftKey);
      if (rawDraft) {
        try {
          const parsedDraft = JSON.parse(rawDraft);
          setForm({ ...INIT, ...(parsedDraft.form || parsedDraft) });
          setDraftShifts(Array.isArray(parsedDraft.shifts) ? parsedDraft.shifts : []);
          setDraftSaved(true);
        } catch {
          localStorage.removeItem(draftKey);
        }
      }

      organizerVerificationApi.getMine()
        .then((response) => setVerification(response.data))
        .catch(() => setVerification({ status: 'Unverified', canCreateEvents: false }))
        .finally(() => setCheckingVerification(false));
    }

    if (isEdit) {
      eventApi.getById(id)
        .then((response) => {
          const ev = response.data;
          setForm({
            title: ev.title || '',
            description: ev.description || '',
            location: ev.location || '',
            latitude: ev.latitude || '',
            longitude: ev.longitude || '',
            checkInRadiusKm: ev.checkInRadiusKm || 0.5,
            startDate: ev.startDate ? ev.startDate.slice(0, 16) : '',
            endDate: ev.endDate ? ev.endDate.slice(0, 16) : '',
            minParticipants: ev.minParticipants || 1,
            maxParticipants: ev.maxParticipants || 50,
            requiresKyc: Boolean(ev.requiresKyc),
            categoryId: ev.categoryId || '',
            imageUrl: ev.imageUrl || '',
            requiredSkillIds: ev.requiredSkillIds || '[]',
          });
        })
        .catch(() => navigate('/my-events'))
        .finally(() => setLoading(false));
    }
  }, [draftKey, id, isEdit, navigate]);

  useEffect(() => {
    const query = form.location.trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      setAddressError('');
      return undefined;
    }

    const timer = window.setTimeout(() => {
      searchAddress(query);
    }, 550);

    return () => window.clearTimeout(timer);
  }, [form.location, searchAddress]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationNote('Trình duyệt không hỗ trợ định vị. Bạn vẫn có thể click trên bản đồ hoặc nhập tọa độ thủ công.');
      return;
    }

    setLocating(true);
    setLocationNote('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = pos.coords.latitude.toFixed(6);
        const longitude = pos.coords.longitude.toFixed(6);
        setMapLocation({ latitude, longitude });
        setLocating(false);
      },
      () => {
        setLocationNote('Không lấy được vị trí hiện tại. Hãy kiểm tra quyền định vị hoặc click trực tiếp trên bản đồ.');
        setLocating(false);
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  };

  const saveDraft = () => {
    localStorage.setItem(draftKey, JSON.stringify({ form, shifts: draftShifts }));
    setDraftSaved(true);
    setError('');
    setStepError('');
  };

  const goNext = () => {
    const message = validateCurrentStep();
    if (message) {
      setStepError(message);
      return;
    }

    const nextStep = Math.min(currentStep + 1, STEPS.length - 1);
    setStepError('');
    setError('');
    setCurrentStep(nextStep);
    setMaxUnlockedStep((step) => Math.max(step, nextStep));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setStepError('');
    setCurrentStep((step) => Math.max(step - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const jumpToStep = (index) => {
    if (index <= currentStep) {
      setStepError('');
      setCurrentStep(index);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    for (let step = 0; step < index; step += 1) {
      const message = validateCurrentStep(step);
      if (message) {
        setStepError(message);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    setStepError('');
    setCurrentStep(index);
    setMaxUnlockedStep((step) => Math.max(step, index));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const canReachStep = useCallback((targetIndex) => {
    for (let step = 0; step < targetIndex; step += 1) {
      if (validateCurrentStep(step)) return false;
    }

    return true;
  }, [validateCurrentStep]);

  const handleSubmit = async () => {
    setError('');
    setStepError('');

    const validationMessage = validateAll();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSaving(true);

    const payload = {
      ...form,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      checkInRadiusKm: parseFloat(form.checkInRadiusKm),
      minParticipants: parseInt(form.minParticipants, 10),
      maxParticipants: parseInt(form.maxParticipants, 10),
      categoryId: parseInt(form.categoryId, 10),
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
    };

    try {
      if (isEdit) {
        await eventApi.update(id, payload);
      } else {
        const response = await eventApi.create(payload);
        const createdEventId = response.data?.id;
        if (createdEventId && draftShifts.length > 0) {
          for (const shift of draftShifts) {
            await eventApi.createShift(createdEventId, {
              name: shift.name,
              startTime: new Date(shift.startTime).toISOString(),
              endTime: new Date(shift.endTime).toISOString(),
              maxVolunteers: Number(shift.maxVolunteers),
              createChannel: Boolean(shift.createChannel),
            });
          }
        }
      }
      localStorage.removeItem(draftKey);
      navigate('/my-events');
    } catch (err) {
      setError(err.response?.data?.message || 'Lưu sự kiện thất bại.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || (!isEdit && checkingVerification)) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isEdit && verification && !verification.canCreateEvents) {
    const statusLabel = {
      Unverified: 'Chưa gửi hồ sơ',
      PendingVerification: 'Đang chờ admin duyệt',
      ChangesRequested: 'Cần bổ sung thông tin',
      Rejected: 'Bị từ chối',
    }[verification.status] || verification.status;

    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="card space-y-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <i className="fa-solid fa-building-shield text-xl" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Cần xác minh tổ chức trước khi tạo sự kiện</h1>
            <p className="mt-2 text-sm text-gray-500">
              Trạng thái hiện tại: <span className="font-semibold text-amber-700">{statusLabel}</span>.
              Sau khi admin duyệt hồ sơ, bạn có thể tạo sự kiện và gửi sự kiện vào luồng kiểm duyệt nội dung.
            </p>
          </div>
          {verification.adminNote && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-semibold">Phản hồi từ admin</p>
              <p className="mt-1">{verification.adminNote}</p>
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/organizer/verification" className="btn-primary text-center">
              Mở hồ sơ xác minh
            </Link>
            <button type="button" onClick={() => navigate('/my-events')} className="btn-secondary">
              Quay lại sự kiện của tôi
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    if (currentStep === 0) {
      return (
        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Thông tin cơ bản</h2>
            <p className="mt-1 text-sm text-gray-500">Đặt tên ngắn gọn, mô tả rõ mục tiêu và chọn danh mục để volunteer dễ tìm thấy sự kiện.</p>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700">Tên sự kiện *</label>
              <CharacterCount value={form.title} max={80} />
            </div>
            <input
              type="text"
              value={form.title}
              onInput={(event) => set('title', event.target.value)}
              onChange={(event) => set('title', event.target.value)}
              className="input-field"
              maxLength={80}
              placeholder="VD: Ngày hội trồng cây xanh 2026"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700">Mô tả</label>
              <CharacterCount value={form.description} max={1600} />
            </div>
            <textarea
              rows={6}
              value={form.description}
              onInput={(event) => set('description', event.target.value)}
              onChange={(event) => set('description', event.target.value)}
              className="input-field resize-none"
              maxLength={1600}
              placeholder="Mô tả hoạt động, nhiệm vụ của volunteer và tác động xã hội kỳ vọng..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Danh mục *</label>
            <select value={form.categoryId} onInput={(event) => set('categoryId', event.target.value)} onChange={(event) => set('categoryId', event.target.value)} className="input-field">
              <option value="">-- Chọn danh mục --</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>

          {skills.length > 0 && (
            <div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700">Kỹ năng cần có</label>
                <FieldHint>Chọn kỹ năng để hệ thống gợi ý sự kiện phù hợp hơn cho volunteer.</FieldHint>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => {
                  const checked = selectedSkillIds.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                        checked ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {checked && <i className="fa-solid fa-check mr-1 text-[10px]" />}
                      {skill.name}
                      {skill.category && <span className="ml-1 opacity-70">· {skill.category}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </section>
      );
    }

    if (currentStep === 1) {
      return (
        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Địa điểm</h2>
            <p className="mt-1 text-sm text-gray-500">Nhập địa chỉ để lấy gợi ý tự động, hoặc chọn trực tiếp trên bản đồ.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Địa điểm *</label>
            <div className="relative">
              <input
                type="text"
                value={form.location}
                onInput={(event) => {
                  set('location', event.target.value);
                  setAddressError('');
                }}
                onChange={(event) => {
                  set('location', event.target.value);
                  setAddressError('');
                }}
                className="input-field pr-10"
                placeholder="Số nhà, đường, phường/xã, quận/huyện, thành phố..."
              />
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                {addressSearching || reverseGeocoding ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                ) : (
                  <i className="fa-solid fa-location-dot" />
                )}
              </div>
            </div>

            {addressSuggestions.length > 0 && (
              <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                {addressSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => selectAddressSuggestion(suggestion)}
                    className="block w-full border-b border-gray-100 px-3 py-2 text-left text-sm text-gray-700 last:border-b-0 hover:bg-primary-50 hover:text-primary-700"
                  >
                    <span className="block font-medium">{suggestion.label}</span>
                    <span className="mt-0.5 block text-xs text-gray-400">{suggestion.latitude}, {suggestion.longitude}</span>
                  </button>
                ))}
              </div>
            )}

            {reverseGeocoding && <FieldHint>Đang cập nhật địa chỉ theo vị trí trên bản đồ...</FieldHint>}
            {addressError && <div className="mt-2"><Notice type="warn">{addressError}</Notice></div>}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-sm font-medium text-gray-700">Chọn vị trí trên bản đồ *</label>
              <button type="button" onClick={handleUseCurrentLocation} disabled={locating} className="btn-secondary btn-sm flex items-center gap-2">
                <i className={`fa-solid fa-location-crosshairs ${locating ? 'fa-spin' : ''}`} />
                {locating ? 'Đang định vị...' : 'Lấy vị trí hiện tại'}
              </button>
            </div>
            <Suspense fallback={<div className="h-80 rounded-xl bg-gray-100 animate-pulse" />}>
              <LocationPickerMap latitude={form.latitude} longitude={form.longitude} onChange={setMapLocation} height={340} />
            </Suspense>
            <FieldHint>Click trên bản đồ hoặc kéo marker để cập nhật tọa độ. Nếu reverse geocode khả dụng, địa chỉ sẽ đổi theo vị trí vừa chọn.</FieldHint>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Vĩ độ (Latitude)</label>
              <input type="number" step="any" value={form.latitude} onInput={(event) => set('latitude', event.target.value)} onChange={(event) => set('latitude', event.target.value)} className="input-field" placeholder="10.7769" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Kinh độ (Longitude)</label>
              <input type="number" step="any" value={form.longitude} onInput={(event) => set('longitude', event.target.value)} onChange={(event) => set('longitude', event.target.value)} className="input-field" placeholder="106.7009" />
            </div>
          </div>

          {!form.latitude || !form.longitude ? <Notice type="error">Vui lòng chọn tọa độ trước khi lưu sự kiện.</Notice> : null}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Bán kính GPS cho điểm danh (km)</label>
            <input
              type="number"
              min="0.05"
              max="10"
              step="0.05"
              value={form.checkInRadiusKm}
              onInput={(event) => set('checkInRadiusKm', event.target.value)}
              onChange={(event) => set('checkInRadiusKm', event.target.value)}
              className="input-field"
            />
            <FieldHint>Mặc định 0.5 km. Sự kiện trong phòng nên để nhỏ hơn, sự kiện ngoài trời rộng có thể tăng nhưng tối đa 10 km.</FieldHint>
          </div>

          {locationNote && <Notice type="info">{locationNote}</Notice>}
        </section>
      );
    }

    if (currentStep === 2) {
      return (
        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Thời gian & số lượng</h2>
            <p className="mt-1 text-sm text-gray-500">Thiết lập thời lượng sự kiện và ngưỡng số người để organizer biết khi nào cần cảnh báo.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Bắt đầu *</label>
              <input type="datetime-local" value={form.startDate} onInput={(event) => setEventStartDate(event.target.value)} onChange={(event) => setEventStartDate(event.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Kết thúc *</label>
              <input type="datetime-local" min={form.startDate || undefined} value={form.endDate} onInput={(event) => set('endDate', event.target.value)} onChange={(event) => set('endDate', event.target.value)} className="input-field" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase text-gray-500">Gợi ý thời lượng</span>
            {[2, 4, 8].map((hours) => (
              <button key={hours} type="button" onClick={() => setQuickDuration(hours)} disabled={!form.startDate} className="btn-secondary btn-sm disabled:opacity-50">
                {hours} giờ
              </button>
            ))}
            <button type="button" onClick={() => setQuickDuration(24)} disabled={!form.startDate} className="btn-secondary btn-sm disabled:opacity-50">
              Cả ngày
            </button>
          </div>
          {dateInvalid && <Notice type="error">Thời gian kết thúc phải sau thời gian bắt đầu.</Notice>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Số lượng tối thiểu *</label>
              <input type="number" min={1} value={form.minParticipants} onInput={(event) => set('minParticipants', event.target.value)} onChange={(event) => set('minParticipants', event.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Số lượng tối đa *</label>
              <input type="number" min={1} value={form.maxParticipants} onInput={(event) => set('maxParticipants', event.target.value)} onChange={(event) => set('maxParticipants', event.target.value)} className="input-field" />
            </div>
          </div>

          {minMaxInvalid ? (
            <Notice type="error">Số tối thiểu không được lớn hơn số tối đa.</Notice>
          ) : (
            <Notice type="warn">Nếu chưa đủ số người tối thiểu, sự kiện vẫn có thể bắt đầu nhưng hệ thống sẽ cảnh báo organizer trên màn quản lý.</Notice>
          )}
          {!isEdit && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Ca làm việc dự kiến</h3>
                  <p className="text-xs text-gray-500">Có thể thêm ngay khi tạo sự kiện. Mỗi ca phải nằm trong thời gian sự kiện.</p>
                </div>
                {form.startDate && form.endDate && !dateInvalid && (
                  <span className="text-xs text-gray-500">{new Date(form.startDate).toLocaleString('vi-VN')} - {new Date(form.endDate).toLocaleString('vi-VN')}</span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_1fr_1fr_110px]">
                <input type="text" value={shiftDraft.name} onChange={(event) => setShiftDraft((previous) => ({ ...previous, name: event.target.value }))} className="input-field" placeholder="VD: Ca sáng, Hậu cần..." />
                <input type="datetime-local" min={form.startDate || undefined} max={form.endDate || undefined} value={shiftDraft.startTime} onChange={(event) => setShiftDraft((previous) => ({ ...previous, startTime: event.target.value }))} className="input-field" />
                <input type="datetime-local" min={shiftDraft.startTime || form.startDate || undefined} max={form.endDate || undefined} value={shiftDraft.endTime} onChange={(event) => setShiftDraft((previous) => ({ ...previous, endTime: event.target.value }))} className="input-field" />
                <input type="number" min={1} value={shiftDraft.maxVolunteers} onChange={(event) => setShiftDraft((previous) => ({ ...previous, maxVolunteers: event.target.value }))} className="input-field" placeholder="Số người" />
              </div>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={Boolean(shiftDraft.createChannel)} onChange={(event) => setShiftDraft((previous) => ({ ...previous, createChannel: event.target.checked }))} />
                  Tạo kênh riêng cho ca
                </label>
                <button type="button" onClick={addDraftShift} className="btn-secondary btn-sm">
                  <i className="fa-solid fa-plus mr-1.5" /> Thêm ca
                </button>
              </div>

              {draftShifts.length > 0 && (
                <div className="mt-4 space-y-2">
                  {draftShifts.map((shift) => (
                    <div key={shift.id} className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{shift.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(shift.startTime).toLocaleString('vi-VN')} - {new Date(shift.endTime).toLocaleString('vi-VN')} · tối đa {shift.maxVolunteers} người
                          {shift.createChannel ? ' · có kênh riêng' : ''}
                        </p>
                      </div>
                      <button type="button" onClick={() => removeDraftShift(shift.id)} className="text-sm font-semibold text-red-500 hover:text-red-600">Xóa</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      );
    }

    if (currentStep === 3) {
      return (
        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Điều kiện tham gia</h2>
            <p className="mt-1 text-sm text-gray-500">Đặt điều kiện rõ ràng để volunteer biết mình có đủ điều kiện đăng ký hay không.</p>
          </div>

          <label className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${form.requiresKyc ? 'border-primary-200 bg-primary-50 text-primary-800' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
            <input type="checkbox" className="mt-1" checked={form.requiresKyc} onChange={(event) => set('requiresKyc', event.target.checked)} />
            <span>
              <span className="block font-semibold">Yêu cầu volunteer đã xác thực KYC</span>
              <span className="mt-1 block leading-5">Khi bật lựa chọn này, volunteer chưa KYC verified sẽ bị chặn khi đăng ký sự kiện.</span>
            </span>
          </label>

          {form.requiresKyc && <Notice type="warn">Volunteer chưa xác thực KYC sẽ thấy thông báo yêu cầu hoàn tất xác minh trước khi đăng ký.</Notice>}

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">Kỹ năng đang yêu cầu</h3>
            {selectedSkills.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedSkills.map((skill) => (
                  <span key={skill.id} className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">{skill.name}</span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">Chưa chọn kỹ năng bắt buộc. Volunteer vẫn có thể đăng ký nếu đáp ứng các điều kiện khác.</p>
            )}
            <button type="button" onClick={() => jumpToStep(0)} className="mt-3 text-sm font-semibold text-primary-700 hover:text-primary-800">
              Chỉnh kỹ năng ở bước thông tin cơ bản
            </button>
          </div>
        </section>
      );
    }

    if (currentStep === 4) {
      return (
        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ảnh sự kiện</h2>
            <p className="mt-1 text-sm text-gray-500">Ảnh thật giúp volunteer hình dung hoạt động tốt hơn.</p>
          </div>

          <Notice type="info">Nên dùng ảnh thật của hoạt động hoặc địa điểm. Tránh ảnh logo, poster nhiều chữ hoặc ảnh quá tối.</Notice>

          <ImageUploadField
            label="Ảnh bìa"
            value={form.imageUrl}
            onChange={(url) => set('imageUrl', url)}
            helper="Upload ảnh từ máy để hiển thị trên trang danh sách và chi tiết sự kiện."
            variant="card"
          />
        </section>
      );
    }

    return (
      <section className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Xem trước & gửi duyệt</h2>
          <p className="mt-1 text-sm text-gray-500">Kiểm tra lại thông tin như volunteer sẽ đọc trước khi gửi admin duyệt.</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="aspect-[16/7] bg-gray-100">
            {form.imageUrl ? (
              <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                <i className="fa-regular fa-image mr-2" /> Chưa có ảnh bìa
              </div>
            )}
          </div>
          <div className="space-y-5 p-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedCategory && <span className="badge bg-blue-50 text-blue-700">{selectedCategory.name}</span>}
                {form.requiresKyc && <span className="badge bg-amber-50 text-amber-700">Yêu cầu KYC</span>}
              </div>
              <h3 className="mt-3 text-2xl font-bold text-gray-950">{form.title || 'Tên sự kiện'}</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">{form.description || 'Mô tả sự kiện sẽ hiển thị tại đây.'}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm text-gray-700 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-3">
                <i className="fa-regular fa-calendar mr-2 text-primary-600" />
                {form.startDate ? new Date(form.startDate).toLocaleString('vi-VN') : 'Chưa có thời gian bắt đầu'}
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <i className="fa-solid fa-users mr-2 text-primary-600" />
                {form.minParticipants || 1} - {form.maxParticipants || 50} volunteer
              </div>
              <div className="rounded-xl bg-gray-50 p-3 sm:col-span-2">
                <i className="fa-solid fa-location-dot mr-2 text-primary-600" />
                {form.location || 'Chưa có địa điểm'}
              </div>
            </div>

            {selectedSkills.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Kỹ năng cần có</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedSkills.map((skill) => <span key={skill.id} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">{skill.name}</span>)}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-4 sm:grid-cols-3">
              {STEPS.slice(0, 5).map((step, index) => (
                <button key={step.id} type="button" onClick={() => jumpToStep(index)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700">
                  <i className="fa-solid fa-pen mr-1.5" /> Sửa {step.title.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {validateAll() && <Notice type="warn">{validateAll()}</Notice>}
      </section>
    );
  };

  return (
    <div className="mx-auto max-w-5xl pb-28">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Quay lại">
            <i className="fa-solid fa-arrow-left" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}</h1>
            <p className="mt-1 text-sm text-gray-500">Bước {currentStep + 1}/{STEPS.length}: {STEPS[currentStep].title}</p>
          </div>
        </div>
        {!isEdit && (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
            <i className="fa-solid fa-hourglass-half mr-2" /> Gửi xong sẽ chờ admin duyệt
          </span>
        )}
      </div>

      <div className="card mb-5 p-4">
        <div className="hidden grid-cols-6 gap-3 md:grid">
          {STEPS.map((step, index) => {
            const active = index === currentStep;
            const reachable = canReachStep(index);
            const unlocked = index <= currentStep || (index <= maxUnlockedStep + 1 && reachable);
            const done = index < Math.max(currentStep, maxUnlockedStep) && canReachStep(index + 1);
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => jumpToStep(index)}
                disabled={!unlocked}
                className={`group flex min-h-[92px] flex-col items-center justify-start gap-2 rounded-xl border px-3 py-3 text-center transition ${
                  active ? 'border-primary-200 bg-primary-50' : done ? 'border-emerald-100 bg-emerald-50/50' : unlocked ? 'border-gray-100 bg-white hover:border-primary-100 hover:bg-primary-50/40' : 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400 opacity-70'
                }`}
              >
                <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  active ? 'bg-primary-600 text-white shadow-md' : done ? 'bg-emerald-500 text-white' : unlocked ? 'bg-gray-100 text-gray-500' : 'bg-gray-200 text-gray-400'
                }`}>
                  {done ? <i className="fa-solid fa-check" /> : index + 1}
                </span>
                <span className={`flex min-h-[34px] items-center text-sm font-semibold leading-4 ${active ? 'text-primary-700' : 'text-gray-700'}`}>
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>
        <div className="md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Bước {currentStep + 1}/{STEPS.length}</p>
              <p className="text-base font-semibold text-gray-900">{STEPS[currentStep].title}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">{currentStep + 1}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {(error || stepError) && (
        <div className="mb-5">
          <Notice type="error">{error || stepError}</Notice>
        </div>
      )}

      {draftSaved && (
        <div className="mb-5">
          <Notice type="success">Đã lưu nháp trên trình duyệt này.</Notice>
        </div>
      )}

      <div>
        <div className="card p-5 sm:p-6">
          {renderStep()}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
                Hủy
              </button>
              <button type="button" onClick={saveDraft} className="btn-secondary">
                <i className="fa-regular fa-bookmark mr-2" /> Lưu nháp
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <button type="button" onClick={goBack} disabled={currentStep === 0} className="btn-secondary">
                Quay lại
              </button>
              {currentStep < STEPS.length - 1 ? (
                <button type="button" onClick={goNext} className="btn-primary">
                  {currentStep === 4 ? 'Xem trước' : 'Tiếp tục'} <i className="fa-solid fa-arrow-right ml-2" />
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={saving || Boolean(validateAll())} className="btn-primary">
                  {saving && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  <i className="fa-solid fa-paper-plane mr-2" /> {isEdit ? 'Lưu thay đổi' : 'Gửi duyệt'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
