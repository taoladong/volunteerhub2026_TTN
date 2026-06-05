import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
    clearStoredAuth,
    getMe,
    getStoredToken,
    logoutUser,
} from "../services/authService";
import {
    getDashboard,
    getMyBadges,
    getMyCertificates,
} from "../services/dashboardService";

export default function VolunteerDashboardPage() {
    const navigate = useNavigate();
    const token = getStoredToken();

    const [currentUser, setCurrentUser] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [badges, setBadges] = useState([]);
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const [userData, dashboardData, badgesData, certificatesData] = await Promise.all([
                    getMe(),
                    getDashboard(),
                    getMyBadges(),
                    getMyCertificates(),
                ]);

                setCurrentUser(userData);
                setDashboard(dashboardData);
                setBadges(Array.isArray(badgesData) ? badgesData : []);
                setCertificates(Array.isArray(certificatesData) ? certificatesData : []);
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
            "Volunteer"
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
        <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d] antialiased">
            <div className="flex min-h-screen">
                <aside className="sticky left-0 top-0 flex h-screen w-64 flex-col space-y-8 bg-[#f3f4f5] p-6">
                    <div>
                        <h1 className="text-lg font-black text-[#191c1d]">VolunteerHub</h1>
                        <p className="text-xs font-medium uppercase tracking-wider text-[#3d494c]">
                            Volunteer Portal
                        </p>
                    </div>

                    <nav className="flex-1 space-y-2">
                        <button className="w-full rounded-xl bg-white px-4 py-3 text-left font-medium text-[#00687b] shadow-sm">
                            Dashboard
                        </button>
                        <button
                            onClick={() => navigate("/explore")}
                            className="w-full rounded-xl px-4 py-3 text-left font-medium text-[#3d494c] transition hover:bg-slate-200"
                        >
                            Explore Events
                        </button>
                        <button
                            onClick={() => navigate("/change-password")}
                            className="w-full rounded-xl px-4 py-3 text-left font-medium text-[#3d494c] transition hover:bg-slate-200"
                        >
                            Change Password
                        </button>
                    </nav>

                    <button
                        onClick={handleLogout}
                        className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-800 transition hover:bg-slate-300"
                    >
                        Logout
                    </button>
                </aside>

                <main className="flex-1 overflow-y-auto p-10">
                    <header className="mb-12 flex justify-between">
                        <div>
                            <h2 className="mb-2 text-4xl font-bold tracking-tight text-[#191c1d]">
                                {loading ? "Loading..." : `Welcome back, ${displayName}.`}
                            </h2>
                            <p className="text-lg text-[#3d494c]">
                                Volunteer metrics are loaded from the backend dashboard endpoint.
                            </p>
                        </div>
                    </header>

                    <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-4">
                        <div className="rounded-xl bg-white p-8">
                            <p className="text-sm text-[#3d494c]">Registrations</p>
                            <p className="mt-2 text-4xl font-black">{dashboard?.totalRegistrations ?? 0}</p>
                        </div>
                        <div className="rounded-xl bg-white p-8">
                            <p className="text-sm text-[#3d494c]">Attended Events</p>
                            <p className="mt-2 text-4xl font-black">{dashboard?.attendedEvents ?? 0}</p>
                        </div>
                        <div className="rounded-xl bg-white p-8">
                            <p className="text-sm text-[#3d494c]">Volunteer Hours</p>
                            <p className="mt-2 text-4xl font-black">{dashboard?.totalHours ?? 0}</p>
                        </div>
                        <div className="rounded-xl bg-white p-8">
                            <p className="text-sm text-[#3d494c]">Badges</p>
                            <p className="mt-2 text-4xl font-black">{badges.length}</p>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        <section className="rounded-2xl bg-white p-8 shadow-sm">
                            <div className="mb-6 flex items-center justify-between">
                                <h3 className="text-2xl font-bold">Upcoming Events</h3>
                                <Link to="/explore" className="font-semibold text-[#00687b]">
                                    View all
                                </Link>
                            </div>

                            <div className="space-y-4">
                                {(dashboard?.upcomingEvents || []).length ? (
                                    dashboard.upcomingEvents.map((event) => (
                                        <button
                                            key={event.id}
                                            onClick={() => navigate(`/events/${event.id}`)}
                                            className="w-full rounded-2xl bg-[#f3f4f5] p-5 text-left transition hover:bg-[#e7e8e9]"
                                        >
                                            <div className="font-bold text-[#191c1d]">{event.title}</div>
                                            <div className="mt-2 text-sm text-[#3d494c]">{event.location}</div>
                                            <div className="mt-1 text-sm text-[#3d494c]">
                                                {new Date(event.startDate).toLocaleString()}
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-[#3d494c]">No upcoming events.</p>
                                )}
                            </div>
                        </section>

                        <section className="rounded-2xl bg-white p-8 shadow-sm">
                            <h3 className="mb-6 text-2xl font-bold">Certificates</h3>

                            <div className="space-y-4">
                                {certificates.length ? (
                                    certificates.map((certificate) => (
                                        <div key={certificate.id} className="rounded-2xl bg-[#f3f4f5] p-5">
                                            <div className="font-bold text-[#191c1d]">
                                                {certificate.certificateCode}
                                            </div>
                                            <div className="mt-2 text-sm text-[#3d494c]">
                                                Hours: {certificate.volunteerHours}
                                            </div>
                                            <div className="mt-1 text-sm text-[#3d494c]">
                                                Issued: {new Date(certificate.issuedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[#3d494c]">No certificates issued yet.</p>
                                )}
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}
