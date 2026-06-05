import { Link } from "react-router-dom";
import AuthSidePanel from "../components/AuthSidePanel";

export default function ConfirmEmailResultPage() {
    return (
        <main className="min-h-screen grid grid-cols-1 bg-slate-50 lg:grid-cols-12">
            <AuthSidePanel />

            <section className="flex flex-col justify-center bg-slate-50 px-8 py-12 md:px-16 lg:col-span-5">
                <div className="mx-auto max-w-md rounded-[32px] bg-white p-8 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-700">
                        !
                    </div>

                    <p className="mt-6 text-xs font-bold uppercase tracking-[0.32em] text-slate-500">
                        Account Activation
                    </p>
                    <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                        Email verification is not enabled
                    </h1>
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                        The current backend does not use email-confirmation links. Use the
                        login page after registration.
                    </p>

                    <div className="mt-8 flex flex-col gap-3">
                        <Link
                            to="/login"
                            className="inline-flex w-full items-center justify-center rounded-2xl bg-cyan-700 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-cyan-800"
                        >
                            Go to Login
                        </Link>
                        <Link
                            to="/register"
                            className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Back to Register
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
