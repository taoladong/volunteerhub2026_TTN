const AUTH_KEYS = ["token", "refreshToken", "currentUser"];

export const getStoredToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

export const getStoredRefreshToken = () =>
    localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

export const getStoredCurrentUser = () => {
    const rawUser =
        localStorage.getItem("currentUser") || sessionStorage.getItem("currentUser");

    return rawUser ? JSON.parse(rawUser) : null;
};

export const getAuthStorage = () => {
    if (localStorage.getItem("token") || localStorage.getItem("refreshToken")) {
        return localStorage;
    }

    if (sessionStorage.getItem("token") || sessionStorage.getItem("refreshToken")) {
        return sessionStorage;
    }

    return localStorage;
};

export const clearStoredAuth = () => {
    AUTH_KEYS.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
};

export const setStoredAuth = ({
    token,
    refreshToken,
    currentUser,
    rememberMe = false,
}) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;

    AUTH_KEYS.forEach((key) => otherStorage.removeItem(key));

    if (token) {
        storage.setItem("token", token);
    }

    if (refreshToken) {
        storage.setItem("refreshToken", refreshToken);
    }

    if (currentUser) {
        storage.setItem("currentUser", JSON.stringify(currentUser));
    }
};

export const updateStoredAuth = ({ token, refreshToken, currentUser }) => {
    const storage = getAuthStorage();

    if (token) {
        storage.setItem("token", token);
    }

    if (refreshToken !== undefined) {
        if (refreshToken) {
            storage.setItem("refreshToken", refreshToken);
        } else {
            storage.removeItem("refreshToken");
        }
    }

    if (currentUser) {
        storage.setItem("currentUser", JSON.stringify(currentUser));
    }
};
