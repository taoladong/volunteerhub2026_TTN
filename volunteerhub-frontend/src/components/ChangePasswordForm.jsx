import { useState } from "react";
import { changePassword } from "../services/authService";

export default function ChangePasswordForm() {
    const [form, setForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        if (form.newPassword.length < 8) {
            setError("New password must be at least 8 characters long.");
            return;
        }

        if (form.newPassword !== form.confirmNewPassword) {
            setError("New password and confirm password do not match.");
            return;
        }

        try {
            setLoading(true);

            const data = await changePassword({
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
                confirmNewPassword: form.confirmNewPassword,
            });

            setSuccessMessage(data?.message || "Password changed successfully.");
            setForm({
                currentPassword: "",
                newPassword: "",
                confirmNewPassword: "",
            });
        } catch (err) {
            setError(
                err?.response?.data?.message ||
                err?.response?.data?.title ||
                "Change password failed."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md w-full mx-auto">
            <div className="mb-10">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                    Change Password
                </h2>
                <p className="text-slate-500 mt-2">
                    Keep your account secure by updating your password.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">
                        Current Password
                    </label>
                    <input
                        name="currentPassword"
                        value={form.currentPassword}
                        onChange={handleChange}
                        type="password"
                        className="w-full px-5 py-4 bg-white rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-cyan-500 transition-all outline-none"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">
                        New Password
                    </label>
                    <input
                        name="newPassword"
                        value={form.newPassword}
                        onChange={handleChange}
                        type="password"
                        className="w-full px-5 py-4 bg-white rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-cyan-500 transition-all outline-none"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">
                        Confirm New Password
                    </label>
                    <input
                        name="confirmNewPassword"
                        value={form.confirmNewPassword}
                        onChange={handleChange}
                        type="password"
                        className="w-full px-5 py-4 bg-white rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-cyan-500 transition-all outline-none"
                        required
                    />
                </div>

                {error && (
                    <div className="rounded-xl bg-red-50 text-red-600 px-4 py-3 text-sm">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="rounded-xl bg-green-50 text-green-700 px-4 py-3 text-sm">
                        {successMessage}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-br from-cyan-700 to-cyan-400 text-white font-bold py-4 rounded-2xl shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all duration-200 disabled:opacity-60"
                >
                    {loading ? "Updating..." : "Change Password"}
                </button>
            </form>
        </div>
    );
}