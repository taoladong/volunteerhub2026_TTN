import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
    clearStoredAuth,
    getMe,
    getStoredToken,
    logoutUser,
} from "../services/authService";
import {
    getAdminUsers,
    getDashboard,
    toggleAdminUserStatus,
} from "../services/dashboardService";

export default function AdminPanelPage() {
    const navigate = useNavigate();
    const token = getStoredToken();

    const [currentUser, setCurrentUser] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const [userData, dashboardData, adminUsers] = await Promise.all([
                    getMe(),
                    getDashboard(),
                    getAdminUsers({ pageSize: 20 }),
                ]);

                setCurrentUser(userData);
                setDashboard(dashboardData);
                setUsers(adminUsers?.items || []);
            } catch {
                clearStoredAuth();
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [token]);

    const displayName = useMemo(() => {
        return (
            currentUser?.fullName ||
            currentUser?.name ||
            currentUser?.userName ||
            currentUser?.email ||
            "Admin"
        );
    }, [currentUser]);

    const handleToggleStatus = async (id) => {
        const updated = await toggleAdminUserStatus(id);
        setUsers((prev) =>
            prev.map((user) =>
                user.id === id ? { ...user, isActive: updated.isActive } : user
            )
        );
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
        } finally {
            clearStoredAuth();
            navigate("/");
        }
    };

    if (!token && !loading) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d]">
            <div className="flex min-h-screen">
                <aside className="sticky left-0 top-0 flex h-screen w-64 flex-col space-y-8 bg-[#f3f4f5] p-6">
                    <div>
                        <span className="text-lg font-black uppercase tracking-widest">
                            VolunteerHub
                        </span>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#3d494c]">
                            Admin Portal
                        </p>
                    </div>

                    <nav className="flex-1 space-y-2">
                        <button className="w-full rounded-xl bg-white px-4 py-3 text-left text-[#00687b] shadow-sm">
                            Dashboard
                        </button>
                    </nav>

                    <button
                        onClick={handleLogout}
                        className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-800 transition hover:bg-slate-300"
                    >
                        Logout
                    </button>
                </aside>

                <main className="flex-1 p-10">
                    <header className="mb-12">
                        <h1 className="text-5xl font-black tracking-tighter text-[#191c1d]">
                            Network Oversight
                        </h1>
                        <p className="mt-3 text-lg text-[#3d494c]">
                            {loading ? "Loading..." : `Signed in as ${displayName}`}
                        </p>
                    </header>

                    <section className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-5">
                        <div className="rounded-3xl bg-white p-8">
                            <p className="font-medium text-[#3d494c]">Total Users</p>
                            <h3 className="mt-2 text-4xl font-black text-[#191c1d]">{dashboard?.totalUsers ?? 0}</h3>
                        </div>
                        <div className="rounded-3xl bg-white p-8">
                            <p className="font-medium text-[#3d494c]">Pending Events</p>
                            <h3 className="mt-2 text-4xl font-black text-[#191c1d]">{dashboard?.pendingEvents ?? 0}</h3>
                        </div>
                        <div className="rounded-3xl bg-white p-8">
                            <p className="font-medium text-[#3d494c]">Total Events</p>
                            <h3 className="mt-2 text-4xl font-black text-[#191c1d]">{dashboard?.totalEvents ?? 0}</h3>
                        </div>
                        <div className="rounded-3xl bg-white p-8">
                            <p className="font-medium text-[#3d494c]">Registrations</p>
                            <h3 className="mt-2 text-4xl font-black text-[#191c1d]">{dashboard?.totalRegistrations ?? 0}</h3>
                        </div>
                        <div className="rounded-3xl bg-white p-8">
                            <p className="font-medium text-[#3d494c]">Certificates</p>
                            <h3 className="mt-2 text-4xl font-black text-[#191c1d]">{dashboard?.totalCertificates ?? 0}</h3>
                        </div>
                    </section>

                    <section className="rounded-3xl bg-white p-8 shadow-sm">
                        <div className="mb-8 flex justify-between">
                            <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
                            <span className="text-sm font-semibold text-[#00687b]">
                                {users.length} loaded
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-xs uppercase tracking-widest text-[#3d494c]">
                                        <th className="pb-6 font-black">Username</th>
                                        <th className="pb-6 font-black">Name</th>
                                        <th className="pb-6 font-black">Email</th>
                                        <th className="pb-6 font-black">Type</th>
                                        <th className="pb-6 font-black">Status</th>
                                        <th className="pb-6 text-right">Action</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id} className="border-t border-[#eef1f2]">
                                            <td className="py-5 font-bold">{user.userName}</td>
                                            <td className="py-5">{user.name}</td>
                                            <td className="py-5">{user.email}</td>
                                            <td className="py-5">{user.userType}</td>
                                            <td className="py-5">
                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                                                        user.isActive
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : "bg-red-100 text-red-700"
                                                    }`}
                                                >
                                                    {user.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="py-5 text-right">
                                                <button
                                                    onClick={() => handleToggleStatus(user.id)}
                                                    className="rounded-xl bg-[#00687b] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                                                >
                                                    Toggle
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}
