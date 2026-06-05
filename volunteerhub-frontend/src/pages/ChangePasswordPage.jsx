import AuthSidePanel from "../components/AuthSidePanel";
import ChangePasswordForm from "../components/ChangePasswordForm";

export default function ChangePasswordPage() {
    return (
        <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50">
            <AuthSidePanel />
            <section className="lg:col-span-5 flex flex-col justify-center px-8 py-12 md:px-16 bg-slate-50">
                <ChangePasswordForm />
            </section>
        </main>
    );
}