import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
    clearStoredAuth,
    getMe,
    getStoredToken,
    logoutUser,
} from "../services/authService";
import { getDashboard } from "../services/dashboardService";

export default function SponsorProjectsPage() {
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
            "Sponsor"
        );
    }, [currentUser]);

    const sponsors = dashboard?.sponsors || [];

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
            <header className="sticky top-0 z-50 bg-[#f8f9fa]">
                <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-8">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tighter text-[#191c1d]">
                            VolunteerHub
                        </h1>
                        <p className="text-xs uppercase tracking-wider text-[#3d494c]">Sponsor Portal</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-[#00687b]">
                            {loading ? "Loading..." : displayName}
                        </span>
                        <button
                            onClick={handleLogout}
                            className="rounded-xl bg-slate-200 px-4 py-2 font-medium text-slate-800 transition hover:bg-slate-300"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-[1440px] px-8 py-12">
                <header className="mb-12 max-w-3xl">
                    <span className="mb-4 block text-xs font-bold uppercase tracking-widest text-[#00687b]">
                        Sponsorship Portal
                    </span>
                    <h1 className="mb-6 text-6xl font-extrabold tracking-tighter text-[#191c1d]">
                        Sponsor activity from the backend.
                    </h1>
                    <p className="text-xl leading-relaxed text-[#3d494c]">
                        This page uses the sponsor dashboard endpoint instead of mock campaign data.
                    </p>
                </header>

                <section className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-3">
                    <div className="rounded-3xl bg-white p-8 shadow-sm">
                        <p className="text-sm text-[#3d494c]">Total Sponsored Events</p>
                        <p className="mt-2 text-4xl font-black text-[#191c1d]">
                            {dashboard?.totalSponsored ?? 0}
                        </p>
                    </div>
                </section>

                <section className="rounded-3xl bg-white p-10 shadow-sm">
                    <h2 className="mb-8 text-2xl font-bold">Sponsored Events</h2>

                    <div className="space-y-4">
                        {sponsors.length ? (
                            sponsors.map((sponsor) => (
                                <div key={sponsor.id} className="rounded-2xl bg-[#f3f4f5] p-6">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div>
                                            <div className="font-bold text-[#191c1d]">
                                                {sponsor.event?.title || `Event #${sponsor.eventId}`}
                                            </div>
                                            <div className="mt-2 text-sm text-[#3d494c]">
                                                Type: {sponsor.contributionType}
                                            </div>
                                            <div className="mt-1 text-sm text-[#3d494c]">
                                                Sponsored at: {new Date(sponsor.sponsoredAt).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-[#3d494c]">Amount</div>
                                            <div className="text-2xl font-black text-[#00687b]">
                                                {sponsor.amount ?? 0}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-[#3d494c]">No sponsored events found.</p>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
