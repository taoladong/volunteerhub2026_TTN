import { apiRequest } from "./apiClient";

export const getDashboard = () =>
    apiRequest({ method: "get", url: "/dashboard" });

export const getMyBadges = () =>
    apiRequest({ method: "get", url: "/my-badges" });

export const getMyCertificates = () =>
    apiRequest({ method: "get", url: "/certificates" });

export const getProfilePassport = () =>
    apiRequest({ method: "get", url: "/profile/passport" });

export const getAdminUsers = (params = {}) =>
    apiRequest({ method: "get", url: "/admin/users", params });

export const toggleAdminUserStatus = (id) =>
    apiRequest({ method: "put", url: `/admin/users/${id}/toggle-status` });
