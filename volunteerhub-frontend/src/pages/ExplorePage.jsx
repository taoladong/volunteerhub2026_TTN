import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearStoredAuth, getMe, logoutUser } from "../services/authService";
import { getEvents } from "../services/eventService";

const formatDateRange = (startDate, endDate) => {
    if (!startDate) {
        return "Date to be announced";
    }

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    const startLabel = start.toLocaleDateString();
    const endLabel = end ? end.toLocaleDateString() : null;

    return endLabel && endLabel !== startLabel ? `${startLabel} - ${endLabel}` : startLabel;
};

export default function ExplorePage() {
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState(null);
    const [keyword, setKeyword] = useState("");
    const [location, setLocation] = useState("");
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchMe = async () => {
            try {
                const data = await getMe();
                setCurrentUser(data);
            } catch {
                clearStoredAuth();
            }
        };

        if (localStorage.getItem("token") || sessionStorage.getItem("token")) {
            fetchMe();
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        const loadEvents = async () => {
            setLoadingEvents(true);
            setError("");

            try {
                const data = await getEvents({
                    keyword: keyword || undefined,
                    location: location || undefined,
                    status: "Approved",
                    pageSize: 24,
                });

                setEvents(data?.items || []);
            } catch (err) {
                setError(
                    err?.response?.data?.message ||
                    err?.message ||
                    "Failed to load events."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingEvents(false);
                }
            }
        };

        const timeout = setTimeout(loadEvents, 250);
        return () => {
            controller.abort();
            clearTimeout(timeout);
        };
    }, [keyword, location]);

    const displayName = useMemo(() => {
        return (
            currentUser?.fullName ||
            currentUser?.name ||
            currentUser?.userName ||
            currentUser?.email ||
            ""
        );
    }, [currentUser]);

    const handleViewDetails = (id) => {
        navigate(`/events/${id}`);
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
        } finally {
            clearStoredAuth();
            setCurrentUser(null);
            navigate("/");
        }
    };

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d] antialiased">
            <header className="sticky top-0 z-50 w-full bg-[#f8f9fa]">
                <nav className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-8">
                    <div className="flex items-center gap-12">
                        <Link to="/" className="text-2xl font-bold tracking-tighter text-[#191c1d]">
                            VolunteerHub
                        </Link>

                        <div className="hidden items-center gap-8 md:flex">
                            <Link
                                to="/explore"
                                className="border-b-2 border-[#00687b] pb-1 font-semibold text-[#00687b]"
                            >
                                Explore
                            </Link>
                            <a className="text-[#3d494c] transition-colors duration-200 hover:text-[#00687b]" href="#!">
                                Organizations
                            </a>
                            <a className="text-[#3d494c] transition-colors duration-200 hover:text-[#00687b]" href="#!">
                                Impact
                            </a>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {!currentUser ? (
                            <>
                                <Link
                                    to="/register"
                                    className="rounded-xl bg-gradient-to-br from-[#00687b] to-[#23b5d3] px-6 py-2.5 font-semibold text-white shadow-lg transition-all active:scale-95"
                                >
                                    Get Started
                                </Link>
                                <Link to="/login" className="font-medium text-[#3d494c] transition hover:text-[#00687b]">
                                    Login
                                </Link>
                            </>
                        ) : (
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-[#00687b]">
                                    {displayName}
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className="rounded-xl bg-slate-200 px-4 py-2 font-medium text-slate-800 transition hover:bg-slate-300"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </nav>
            </header>

            <main className="mx-auto max-w-[1440px] space-y-12 px-8 py-12">
                <section className="space-y-8">
                    <div className="max-w-3xl">
                        <h1 className="mb-4 text-6xl font-extrabold tracking-tight text-[#191c1d]">
                            Find your next{" "}
                            <span className="bg-gradient-to-r from-[#00687b] to-[#23b5d3] bg-clip-text text-transparent">
                                purpose.
                            </span>
                        </h1>
                        <p className="text-lg leading-relaxed text-[#3d494c]">
                            Search approved volunteer opportunities published from the backend.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 rounded-3xl bg-[#f3f4f5] p-3 shadow-sm md:flex-row md:items-center">
                        <input
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            className="w-full rounded-2xl bg-white px-5 py-4 outline-none transition-all focus:ring-2 focus:ring-[#23b5d3] md:flex-1"
                            placeholder="Search by title or description"
                            type="text"
                        />
                        <input
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full rounded-2xl bg-white px-5 py-4 outline-none transition-all focus:ring-2 focus:ring-[#23b5d3] md:flex-1"
                            placeholder="Filter by location"
                            type="text"
                        />
                    </div>
                </section>

                {error && (
                    <section className="rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700">
                        {error}
                    </section>
                )}

                <section className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {loadingEvents ? (
                        Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="overflow-hidden rounded-3xl bg-white p-6 shadow-[0px_12px_32px_rgba(25,28,29,0.04)]">
                                <div className="mb-6 h-56 animate-pulse rounded-2xl bg-slate-200" />
                                <div className="mb-3 h-6 animate-pulse rounded bg-slate-200" />
                                <div className="mb-2 h-4 animate-pulse rounded bg-slate-100" />
                                <div className="h-4 animate-pulse rounded bg-slate-100" />
                            </div>
                        ))
                    ) : events.length === 0 ? (
                        <div className="col-span-full rounded-3xl bg-white p-10 text-center shadow-sm">
                            <h3 className="text-2xl font-bold text-[#191c1d]">No events found</h3>
                            <p className="mt-3 text-[#3d494c]">
                                Try changing the search keyword or location filter.
                            </p>
                        </div>
                    ) : (
                        events.map((event) => (
                            <article
                                key={event.id}
                                className="group overflow-hidden rounded-3xl bg-white shadow-[0px_12px_32px_rgba(25,28,29,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0px_12px_32px_rgba(25,28,29,0.08)]"
                            >
                                <div className="relative h-56 overflow-hidden bg-slate-100">
                                    {event.imageUrl ? (
                                        <img
                                            alt={event.title}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            src={event.imageUrl}
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#beeaf7] to-[#e7e8e9] text-sm font-semibold text-[#416a76]">
                                            No image
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6 p-8">
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-bold text-[#191c1d]">{event.title}</h3>
                                        <p className="font-medium text-[#3d494c]">{event.location || "Location TBD"}</p>
                                        <p className="text-sm text-[#3d494c]">
                                            {formatDateRange(event.startDate, event.endDate)}
                                        </p>
                                    </div>

                                    <p className="line-clamp-3 text-sm leading-6 text-[#3d494c]">
                                        {event.description || "No description available."}
                                    </p>

                                    <div className="flex items-center justify-between border-t border-[#bcc9cd]/20 pt-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#3d494c]">
                                                Capacity
                                            </span>
                                            <span className="text-sm font-semibold text-[#191c1d]">
                                                {event.currentParticipants || 0}/{event.maxParticipants || 0}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => handleViewDetails(event.id)}
                                            className="rounded-xl bg-[#e7e8e9] px-6 py-3 font-bold text-[#00687b] transition-all hover:bg-[#23b5d3] hover:text-[#00424f]"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </section>
            </main>
        </div>
    );
}
