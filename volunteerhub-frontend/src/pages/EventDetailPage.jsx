import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { clearStoredAuth, getStoredToken } from "../services/authService";
import {
    applyToVolunteerEvent,
    getEventById,
    getMyRegistrations,
} from "../services/eventService";

const formatDateTime = (value) => {
    if (!value) {
        return "TBD";
    }

    return new Date(value).toLocaleString();
};

export default function EventDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [event, setEvent] = useState(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        const loadEvent = async () => {
            setLoading(true);
            setError("");

            try {
                const [eventData, registrations] = await Promise.all([
                    getEventById(id),
                    getStoredToken() ? getMyRegistrations() : Promise.resolve([]),
                ]);

                setEvent(eventData);
                setIsRegistered(
                    Array.isArray(registrations) &&
                    registrations.some((registration) => registration.eventId === Number(id))
                );
            } catch (err) {
                setError(
                    err?.response?.data?.message ||
                    err?.message ||
                    "Failed to load event details."
                );
            } finally {
                setLoading(false);
            }
        };

        loadEvent();
    }, [id]);

    const organizerName = useMemo(() => {
        return event?.organizer?.name || event?.organizer?.userName || "Organizer";
    }, [event]);

    const handleApply = async () => {
        if (!getStoredToken()) {
            navigate("/login");
            return;
        }

        setSubmitting(true);
        setError("");
        setSuccessMessage("");

        try {
            await applyToVolunteerEvent({ eventId: Number(id) });
            setIsRegistered(true);
            setSuccessMessage("Registration submitted successfully.");
        } catch (err) {
            const message = err?.response?.data?.message || err?.message || "Failed to register.";

            if (err?.response?.status === 401) {
                clearStoredAuth();
                navigate("/login");
                return;
            }

            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8f9fa] px-8 py-12">
                <div className="mx-auto max-w-[1440px] animate-pulse">
                    <div className="mb-8 h-16 rounded-2xl bg-slate-200" />
                    <div className="mb-8 h-[420px] rounded-3xl bg-slate-200" />
                    <div className="h-8 rounded bg-slate-200" />
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-[#f8f9fa] px-8 py-12">
                <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm">
                    <h1 className="text-3xl font-bold text-[#191c1d]">Event not found</h1>
                    <p className="mt-3 text-[#3d494c]">{error || "The requested event does not exist."}</p>
                    <Link
                        to="/explore"
                        className="mt-6 inline-flex rounded-2xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white"
                    >
                        Back to Explore
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d]">
            <header className="sticky top-0 z-50 w-full bg-[#f8f9fa]">
                <nav className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-8">
                    <div className="flex items-center gap-12">
                        <Link to="/" className="text-2xl font-bold tracking-tighter text-[#191c1d]">
                            VolunteerHub
                        </Link>
                        <Link to="/explore" className="font-semibold text-[#00687b]">
                            Explore
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            to="/volunteer/dashboard"
                            className="rounded-xl bg-[#e7e8e9] px-5 py-2.5 font-medium text-[#191c1d] transition hover:bg-[#d8dcde]"
                        >
                            Dashboard
                        </Link>
                    </div>
                </nav>
            </header>

            <main className="mx-auto max-w-[1440px] px-8 py-12">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
                    <div className="lg:col-span-8">
                        <div className="mb-8 overflow-hidden rounded-3xl bg-slate-100 aspect-[21/9]">
                            {event.imageUrl ? (
                                <img className="h-full w-full object-cover" src={event.imageUrl} alt={event.title} />
                            ) : (
                                <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#beeaf7] to-[#e7e8e9] text-lg font-semibold text-[#416a76]">
                                    No image
                                </div>
                            )}
                        </div>

                        <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-[#191c1d]">
                            {event.title}
                        </h1>

                        <div className="mb-10 flex flex-wrap items-center gap-8 text-[#3d494c]">
                            <div>{formatDateTime(event.startDate)}</div>
                            <div>{event.location || "Location TBD"}</div>
                            <div>Status: {event.status}</div>
                        </div>

                        <div className="mb-12 space-y-6 text-lg leading-relaxed text-[#3d494c]">
                            <p>{event.description || "No description available."}</p>
                        </div>

                        <section className="rounded-3xl bg-white p-8 shadow-sm">
                            <h2 className="mb-4 text-2xl font-bold">Work Shifts</h2>
                            {event.workShifts?.length ? (
                                <div className="space-y-4">
                                    {event.workShifts.map((shift) => (
                                        <div
                                            key={shift.id}
                                            className="rounded-2xl bg-[#f3f4f5] p-5"
                                        >
                                            <div className="font-bold text-[#191c1d]">{shift.name}</div>
                                            <div className="mt-2 text-sm text-[#3d494c]">
                                                {formatDateTime(shift.startTime)} - {formatDateTime(shift.endTime)}
                                            </div>
                                            <div className="mt-2 text-sm text-[#3d494c]">
                                                Capacity: {shift.maxVolunteers}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[#3d494c]">No shifts published for this event.</p>
                            )}
                        </section>
                    </div>

                    <aside className="space-y-8 lg:col-span-4">
                        <div className="sticky top-28 rounded-3xl bg-white p-8 shadow-[0px_12px_32px_rgba(25,28,29,0.04)]">
                            <div className="mb-8 flex items-center justify-between">
                                <div>
                                    <span className="mb-1 block text-sm font-semibold text-[#3d494c]">
                                        Capacity
                                    </span>
                                    <div className="font-bold text-[#00687b]">
                                        {event.currentParticipants || 0}/{event.maxParticipants || 0}
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigator.clipboard.writeText(window.location.href)}
                                    className="rounded-xl bg-[#edeeef] p-3 text-[#191c1d] transition-colors hover:bg-[#e7e8e9]"
                                >
                                    Share
                                </button>
                            </div>

                            <div className="mb-6 rounded-2xl bg-[#f3f4f5] p-5">
                                <div className="text-xs font-bold uppercase tracking-widest text-[#3d494c]">
                                    Organized By
                                </div>
                                <div className="mt-3 text-lg font-bold text-[#191c1d]">
                                    {organizerName}
                                </div>
                            </div>

                            {error && (
                                <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            {successMessage && (
                                <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                                    {successMessage}
                                </div>
                            )}

                            <button
                                onClick={handleApply}
                                disabled={submitting || isRegistered}
                                className="w-full rounded-2xl bg-gradient-to-br from-[#00687b] to-[#23b5d3] py-4 text-lg font-bold text-white shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isRegistered
                                    ? "Already Registered"
                                    : submitting
                                        ? "Submitting..."
                                        : "Apply to Volunteer"}
                            </button>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}
