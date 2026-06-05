import axios from "axios";
import {
    clearStoredAuth,
    getStoredRefreshToken,
    getStoredToken,
    updateStoredAuth,
} from "./authStorage";

const DEFAULT_CORE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const DEFAULT_AUTH_API_BASE_URL =
    import.meta.env.VITE_AUTH_API_BASE_URL || "http://localhost:5000/api";

const buildClient = (baseURL) => {
    const client = axios.create({
        baseURL,
        headers: {
            "Content-Type": "application/json",
        },
    });

    client.interceptors.request.use((config) => {
        const token = getStoredToken();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    });

    return client;
};

export const coreApiClient = buildClient(DEFAULT_CORE_API_BASE_URL);
export const authApiClient = buildClient(DEFAULT_AUTH_API_BASE_URL);

let refreshPromise = null;

const shouldSkipRefresh = (config = {}) => {
    const url = String(config.url || "");

    return (
        config.skipAuthRefresh ||
        url.includes("/auth/login") ||
        url.includes("/auth/register") ||
        url.includes("/auth/refresh")
    );
};

const refreshAccessToken = async () => {
    const storedRefreshToken = getStoredRefreshToken();

    if (!storedRefreshToken) {
        throw new Error("No refresh token available");
    }

    if (!refreshPromise) {
        refreshPromise = authApiClient
            .post(
                "/auth/refresh",
                { refreshToken: storedRefreshToken },
                { skipAuthRefresh: true }
            )
            .then((response) => {
                const payload = response.data;
                const nextToken = payload?.token || payload?.accessToken;

                if (!nextToken) {
                    throw new Error("Refresh response missing access token");
                }

                updateStoredAuth({
                    token: nextToken,
                    refreshToken: payload?.refreshToken,
                    currentUser: payload?.user,
                });

                return nextToken;
            })
            .catch((error) => {
                clearStoredAuth();
                throw error;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
};

const attachRefreshInterceptor = (client) => {
    client.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error?.config;

            if (
                error?.response?.status !== 401 ||
                !originalRequest ||
                originalRequest._retry ||
                shouldSkipRefresh(originalRequest)
            ) {
                throw error;
            }

            originalRequest._retry = true;

            const nextToken = await refreshAccessToken();
            originalRequest.headers = {
                ...originalRequest.headers,
                Authorization: `Bearer ${nextToken}`,
            };

            return client(originalRequest);
        }
    );
};

attachRefreshInterceptor(coreApiClient);
attachRefreshInterceptor(authApiClient);

export const apiRequest = async (config, client = coreApiClient) => {
    const response = await client(config);
    return response.data;
};
