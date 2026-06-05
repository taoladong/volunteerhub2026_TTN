import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthSidePanel from "../components/AuthSidePanel";
import LoginForm from "../components/LoginForm";
import { getMe, loginUser, setStoredAuth } from "../services/authService";

function extractApiError(err, fallbackMessage) {
    const data = err?.response?.data;
    const validationErrors = data?.errors;

    if (validationErrors && typeof validationErrors === "object") {
        const messages = Object.values(validationErrors).flat().filter(Boolean);
        if (messages.length > 0) {
            return messages.join(" ");
        }
    }

    const message = data?.message || data?.title || err?.message || fallbackMessage;
    const normalizedMessage = String(message).toLowerCase();

    if (normalizedMessage.includes("email") && normalizedMessage.includes("verify")) {
        return "Email chưa được xác thực. Vui lòng kiểm tra Gmail và xác thực tài khoản trước khi đăng nhập.";
    }

    return message;
}

export default function LoginPage() {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const getRedirectPathByRole = (user) => {
        const role = String(
            user?.role || user?.roles?.[0] || user?.userType || ""
        ).toLowerCase();

        switch (role) {
            case "volunteer":
                return "/volunteer/dashboard";
            case "organizer":
                return "/organizer/dashboard";
            case "sponsor":
                return "/sponsor/projects";
            case "admin":
                return "/admin/panel";
            default:
                return "/";
        }
    };

    const handleLogin = async (data) => {
        setError("");
        setLoading(true);

        try {
            const res = await loginUser({
                email: data.email,
                password: data.password,
            });

            const token = res.token || res.accessToken;
            const refreshToken = res.refreshToken || "";

            if (!token) {
                throw new Error("API đăng nhập không trả về token.");
            }

            const currentUser = res.user || await getMe();
            setStoredAuth({
                token,
                refreshToken,
                currentUser,
                rememberMe: Boolean(data.rememberMe),
            });

            navigate(getRedirectPathByRole(currentUser), { replace: true });
        } catch (err) {
            console.error("Login failed:", err);
            setError(extractApiError(err, "Đăng nhập thất bại."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-12">
            <AuthSidePanel />
            <section className="flex flex-col justify-center bg-slate-50 px-8 py-12 md:px-16 lg:col-span-5">
                <LoginForm
                    submitText={loading ? "Đang đăng nhập..." : "Đăng nhập"}
                    disabled={loading}
                    error={error}
                    onSubmit={handleLogin}
                />
            </section>
        </main>
    );
}
