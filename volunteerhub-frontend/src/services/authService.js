import { apiRequest, authApiClient } from "./apiClient";
export {
    clearStoredAuth,
    getAuthStorage,
    getStoredCurrentUser,
    getStoredRefreshToken,
    getStoredToken,
    setStoredAuth,
    updateStoredAuth,
} from "./authStorage";
import { getStoredRefreshToken } from "./authStorage";

export const loginUser = (payload) =>
    apiRequest({ method: "post", url: "/auth/login", data: payload }, authApiClient);

export const registerUser = (payload) =>
    apiRequest({ method: "post", url: "/auth/register", data: payload }, authApiClient);

export const getMe = () => apiRequest({ method: "get", url: "/auth/me" }, authApiClient);

export const changePassword = (payload) =>
    apiRequest({ method: "post", url: "/auth/change-password", data: payload }, authApiClient);

export const refreshSession = (payload) =>
    apiRequest({ method: "post", url: "/auth/refresh", data: payload }, authApiClient);

export const logoutUser = (payload) =>
    apiRequest(
        {
            method: "post",
            url: "/auth/logout",
            data: payload ?? { refreshToken: getStoredRefreshToken() || undefined },
        },
        authApiClient
    );
