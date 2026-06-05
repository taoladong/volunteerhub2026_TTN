import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../services/authService";

function extractApiError(err, fallbackMessage) {
    const data = err?.response?.data;
    const validationErrors = data?.errors;

    if (validationErrors && typeof validationErrors === "object") {
        const messages = Object.values(validationErrors)
            .flat()
            .filter(Boolean);

        if (messages.length > 0) {
            return messages.join(" ");
        }
    }

    return data?.message || data?.title || err?.message || fallbackMessage;
}

export default function RegisterForm() {
    const navigate = useNavigate();

    const [role, setRole] = useState("Volunteer");
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        agreeTerms: false,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!form.agreeTerms) {
            setError("Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách quyền riêng tư.");
            return;
        }

        if (form.password.length < 8) {
            setError("Mật khẩu phải có ít nhất 8 ký tự.");
            return;
        }

        try {
            setLoading(true);

            const payload = {
                username: form.email,
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                password: form.password,
                role,
            };

            const data = await registerUser(payload);
            setSuccessMessage(data?.message || "Tạo tài khoản thành công.");
            setTimeout(() => navigate("/login"), 1000);
        } catch (err) {
            setError(extractApiError(err, "Đăng ký thất bại."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-md">
            <div className="mb-12 flex items-center gap-2 lg:hidden">
                <span className="text-xl font-black tracking-tighter text-slate-900">
                    VolunteerHub
                </span>
            </div>

            <div className="mb-10">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                    Tạo tài khoản
                </h2>
                <p className="mt-2 text-slate-500">
                    Bắt đầu hành trình tham gia cộng đồng của bạn.
                </p>
            </div>

            <div className="mb-8 flex rounded-2xl bg-slate-100 p-1">
                <button
                    type="button"
                    onClick={() => setRole("Volunteer")}
                    className={`flex-1 rounded-xl px-4 py-3 text-sm transition-all duration-200 ${
                        role === "Volunteer"
                            ? "bg-white font-semibold text-cyan-700 shadow-sm"
                            : "font-medium text-slate-500 hover:text-slate-900"
                    }`}
                >
                    Tình nguyện viên
                </button>

                <button
                    type="button"
                    onClick={() => setRole("Organizer")}
                    className={`flex-1 rounded-xl px-4 py-3 text-sm transition-all duration-200 ${
                        role === "Organizer"
                            ? "bg-white font-semibold text-cyan-700 shadow-sm"
                            : "font-medium text-slate-500 hover:text-slate-900"
                    }`}
                >
                    Ban tổ chức
                </button>

                <button
                    type="button"
                    onClick={() => setRole("Sponsor")}
                    className={`flex-1 rounded-xl px-4 py-3 text-sm transition-all duration-200 ${
                        role === "Sponsor"
                            ? "bg-white font-semibold text-cyan-700 shadow-sm"
                            : "font-medium text-slate-500 hover:text-slate-900"
                    }`}
                >
                    Nhà tài trợ
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="ml-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                            Tên
                        </label>
                        <input
                            name="firstName"
                            value={form.firstName}
                            onChange={handleChange}
                            placeholder="An"
                            type="text"
                            className="w-full rounded-xl border-none bg-white px-5 py-4 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-cyan-500"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="ml-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                            Họ
                        </label>
                        <input
                            name="lastName"
                            value={form.lastName}
                            onChange={handleChange}
                            placeholder="Nguyễn"
                            type="text"
                            className="w-full rounded-xl border-none bg-white px-5 py-4 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-cyan-500"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="ml-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                        Địa chỉ email
                    </label>
                    <input
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="nguyenvanan@example.com"
                        type="email"
                        className="w-full rounded-xl border-none bg-white px-5 py-4 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-cyan-500"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="ml-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                        Mật khẩu
                    </label>
                    <input
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Nhap mat khau"
                        type="password"
                        className="w-full rounded-xl border-none bg-white px-5 py-4 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-cyan-500"
                        required
                    />
                    <p className="ml-1 mt-1 text-xs font-medium text-slate-500">
                        Mật khẩu phải có ít nhất 8 ký tự.
                    </p>
                </div>

                <div className="mt-4 flex items-start gap-3">
                    <input
                        id="terms"
                        name="agreeTerms"
                        checked={form.agreeTerms}
                        onChange={handleChange}
                        type="checkbox"
                        className="mt-1 h-5 w-5 rounded border-slate-300 text-cyan-700 focus:ring-cyan-600"
                    />
                    <label htmlFor="terms" className="text-sm leading-relaxed text-slate-500">
                        Tôi đồng ý với{" "}
                        <span className="font-semibold text-cyan-700">
                            Điều khoản dịch vụ
                        </span>{" "}
                        và{" "}
                        <span className="font-semibold text-cyan-700">
                            Chính sách quyền riêng tư
                        </span>
                        .
                    </label>
                </div>

                {error && (
                    <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                        {successMessage}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-gradient-to-br from-cyan-700 to-cyan-400 py-4 font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
                >
                    {loading ? "Đang đăng ký..." : "Hoàn tất đăng ký"}
                </button>
            </form>

            <div className="mt-10 border-t border-slate-200 pt-10 text-center">
                <p className="text-slate-500">
                    Đã có tài khoản?
                    <Link to="/login" className="ml-1 font-bold text-cyan-700 hover:underline">
                        Đăng nhập
                    </Link>
                </p>
            </div>
        </div>
    );
}
