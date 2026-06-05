import { useNavigate } from "react-router-dom";
import { clearStoredAuth, logoutUser } from "../services/authService";

export default function LogoutButton() {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            clearStoredAuth();
            navigate("/login");
        }
    };

    return (
        <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition"
        >
            Logout
        </button>
    );
}
