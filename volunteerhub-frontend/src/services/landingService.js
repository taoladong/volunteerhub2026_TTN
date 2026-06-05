import { getMe } from "./authService";
import { apiRequest } from "./apiClient";

export const getCurrentUser = () => getMe();

export const verifyCertificate = (verificationCode) =>
    apiRequest({
        method: "get",
        url: `/certificates/${verificationCode}`,
    });
