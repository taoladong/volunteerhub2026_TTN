import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
    clearStoredAuth,
    getMe,
    getStoredToken,
    logoutUser,
} from "../services/authService";
import { getDashboard } from "../services/dashboardService";

export default function OrganizerDashboardPage() {
    const navigate = useNavigate();
    const token = getStoredToken();

    const [currentUser, setCurrentUser] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const [userData, dashboardData] = await Promise.all([getMe(), getDashboard()]);
                setCurrentUser(userData);
                setDashboard(dashboardData);
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
            "Organizer"
        );
    }, [currentUser]);

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
        <div className="flex min-h-screen bg-[#f8f9fa] text-[#191c1d]">
            <aside className="sticky left-0 top-0 flex h-screen w-64 flex-col space-y-8 bg-[#f3f4f5] p-6">
                <div>
                    <h1 className="text-lg font-black">VolunteerHub</h1>
                    <p className="text-xs uppercase tracking-wider text-[#3d494c]">Organizer Portal</p>
                </div>

                <nav className="flex-1 space-y-2">
                    <button className="w-full rounded-xl bg-white px-4 py-3 text-left font-medium text-[#00687b] shadow-sm">
                        Dashboard
                    </button>
                    <button
                        onClick={() => navigate("/explore")}
                        className="w-full rounded-xl px-4 py-3 text-left font-medium text-[#3d494c] transition hover:bg-slate-200"
                    >
                        Explore
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
                    <h2 className="text-[3.5rem] font-black tracking-tight leading-none text-[#191c1d]">
                        Organizer Hub
                    </h2>
                    <p className="mt-3 text-lg text-[#3d494c]">
                        {loading ? "Loading..." : `Signed in as ${displayName}`}
                    </p>
                </header>

                <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-5">
                    <div className="rounded-2xl bg-white p-8 shadow-sm">
                        <p className="text-sm text-[#3d494c]">Total Events</p>
                        <p className="mt-2 text-4xl font-black">{dashboard?.totalEvents ?? 0}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-8 shadow-sm">
                        <p className="text-sm text-[#3d494c]">Approved</p>
                        <p className="mt-2 text-4xl font-black">{dashboard?.approvedEvents ?? 0}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-8 shadow-sm">
                        <p className="text-sm text-[#3d494c]">Completed</p>
                        <p className="mt-2 text-4xl font-black">{dashboard?.completedEvents ?? 0}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-8 shadow-sm">
                        <p className="text-sm text-[#3d494c]">Pending Registrations</p>
                        <p className="mt-2 text-4xl font-black">{dashboard?.pendingRegistrations ?? 0}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-8 shadow-sm">
                        <p className="text-sm text-[#3d494c]">Confirmed Volunteers</p>
                        <p className="mt-2 text-4xl font-black">{dashboard?.totalVolunteers ?? 0}</p>
                    </div>
                </section>

                <section className="rounded-2xl bg-white p-8 shadow-sm">
                    <div className="mb-6 flex items-center justify-between">
                        <h3 className="text-2xl font-bold">Recent Events</h3>
                        <button
                            onClick={() => navigate("/explore")}
                            className="font-semibold text-[#00687b]"
                        >
                            Browse all
                        </button>
                    </div>

                    <div className="space-y-4">
                        {(dashboard?.recentEvents || []).length ? (
                            dashboard.recentEvents.map((event) => (
                                <button
                                    key={event.id}
                                    onClick={() => navigate(`/events/${event.id}`)}
                                    className="w-full rounded-2xl bg-[#f3f4f5] p-5 text-left transition hover:bg-[#e7e8e9]"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <div className="font-bold text-[#191c1d]">{event.title}</div>
                                            <div className="mt-2 text-sm text-[#3d494c]">
                                                {event.location || "Location TBD"}
                                            </div>
                                        </div>
                                        <div className="text-sm font-semibold text-[#00687b]">
                                            {event.status}
                                        </div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <p className="text-[#3d494c]">No organizer events found.</p>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
