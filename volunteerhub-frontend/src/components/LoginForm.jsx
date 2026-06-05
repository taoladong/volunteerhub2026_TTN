import React from "react";
import { Link } from "react-router-dom";

export default function LoginForm({
    onSubmit,
    submitText,
    disabled = false,
    error = "",
}) {
    const handleSubmit = (e) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);

        const payload = {
            email: formData.get("email") || "",
            password: formData.get("password") || "",
            rememberMe: formData.get("rememberMe") === "on",
        };

        onSubmit?.(payload);
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
                    Đăng nhập
                </h2>
                <p className="mt-2 text-slate-500">
                    Tiếp tục hành trình đóng góp cho cộng đồng của bạn.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="ml-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                        Địa chỉ email
                    </label>
                    <input
                        type="email"
                        name="email"
                        placeholder="nguyenvanan@example.com"
                        autoComplete="email"
                        required
                        className="w-full rounded-xl border-none bg-white px-5 py-4 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-cyan-500"
                    />
                </div>

                <div className="space-y-2">
                    <label className="ml-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                        Mật khẩu
                    </label>
                    <input
                        type="password"
                        name="password"
                        placeholder="Nhập mật khẩu"
                        autoComplete="current-password"
                        required
                        className="w-full rounded-xl border-none bg-white px-5 py-4 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-cyan-500"
                    />
                </div>

                <label className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        name="rememberMe"
                        className="h-5 w-5 rounded border-slate-300 text-cyan-700 focus:ring-cyan-600"
                    />
                    <span className="text-sm leading-relaxed text-slate-500">
                        Ghi nhớ đăng nhập
                    </span>
                </label>

                {error && (
                    <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={disabled}
                    className="w-full rounded-2xl bg-gradient-to-br from-cyan-700 to-cyan-400 py-4 font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
                >
                    {submitText}
                </button>
            </form>

            <div className="mt-10 border-t border-slate-200 pt-10 text-center">
                <p className="text-slate-500">
                    Chưa có tài khoản?
                    <Link to="/register" className="ml-1 font-bold text-cyan-700 hover:underline">
                        Đăng ký ngay
                    </Link>
                </p>
            </div>
        </div>
    );
}
