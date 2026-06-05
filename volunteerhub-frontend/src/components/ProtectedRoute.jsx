import { Navigate } from "react-router-dom";
import { getStoredCurrentUser, getStoredToken } from "../services/authService";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
    const token = getStoredToken();
    const currentUser = getStoredCurrentUser();

    const userRole =
        currentUser?.role ||
        currentUser?.userType ||
        currentUser?.accountType ||
        currentUser?.roles?.[0] ||
        "";

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0) {
        const normalizedAllowedRoles = allowedRoles.map((role) =>
            String(role).toLowerCase()
        );

        if (!normalizedAllowedRoles.includes(String(userRole).toLowerCase())) {
            return <Navigate to="/" replace />;
        }
    }

    return children;
}
