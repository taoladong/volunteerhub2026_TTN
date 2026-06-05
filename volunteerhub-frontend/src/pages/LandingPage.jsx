import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearStoredAuth, getMe, getStoredToken, logoutUser } from "../services/authService";
import { useTranslation } from "react-i18next";


export default function LandingPage() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const { t, i18n } = useTranslation();
    const currentLanguage = i18n.language?.startsWith("vi") ? "vi" : "en";

    const handleLanguageChange = (lang) => {
        i18n.changeLanguage(lang);
        localStorage.setItem("lang", lang);
    };

    const [activeSection, setActiveSection] = useState("");
    const getNavClass = (section) => {
        return activeSection === section
            ? "text-[#00687b] font-semibold border-b-2 border-[#00687b] pb-1 cursor-pointer inline-block"
            : "text-gray-800 hover:text-[#00687b] transition-colors duration-200 cursor-pointer inline-block";
    }

    useEffect(() => {
        const fetchMe = async () => {
            const token = getStoredToken();
            if (!token) return;

            try {
                const data = await getMe();
                setCurrentUser(data);
            } catch (error) {
                console.error("Failed to get current user:", error);
                clearStoredAuth();
            }
        };

        fetchMe();
    }, []);

    const getDisplayName = () => {
        if (!currentUser) return "";

        return (
            currentUser.fullName ||
            currentUser.name ||
            currentUser.userName ||
            currentUser.email ||
            "User"
        );
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            clearStoredAuth();
            setCurrentUser(null);
            navigate("/");
        }
    };

    return (
        <div className="font-sans antialiased">
            <nav className="w-full top-0 sticky z-50 bg-white transition-all border-none">
                <div className="flex justify-between items-center h-20 px-8 max-w-[1440px] mx-auto">
                    <div className="text-2xl font-bold tracking-tighter text-black">
                        VolunteerHub
                    </div>

                    <div className="hidden md:flex items-center space-x-8">
                        <a className={getNavClass("explore")}
                            href="#explore"
                            onClick={() => setActiveSection("explore")}>
                            {t("explore")}
                        </a>
                        <a className={getNavClass("organizations")}
                            href="#organizations"
                            onClick={() => setActiveSection("organizations")}>
                            {t("organizations")}
                        </a>
                        <a className={getNavClass("impact")}
                            href="#impact"
                            onClick={() => setActiveSection("impact")}>
                            {t("impact")}
                        </a>
                        <a className={getNavClass("about")}
                            href="#about"
                            onClick={() => setActiveSection("about")}>
                            {t("about")}
                        </a>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center rounded-full border border-gray-300 bg-white p-1 shadow-sm">
                            <button
                                type="button"
                                onClick={() => handleLanguageChange("vi")}
                                className={`rounded-full px-3 py-1 text-sm font-semibold transition ${currentLanguage === "vi"
                                    ? "bg-[#00687b] text-white"
                                    : "hover:text-[#00687b]"
                                    }`}
                            >
                                {t("languageVietnamese")}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleLanguageChange("en")}
                                className={`rounded-full px-3 py-1 text-sm font-semibold transition ${currentLanguage === "en"
                                    ? "bg-[#00687b] text-white"
                                    : "hover:text-[#00687b]"
                                    }`}
                            >
                                {t("languageEnglish")}
                            </button>
                        </div>

                        {!currentUser ? (
                            <>
                                <Link
                                    to="/login"
                                    className="hover:text-[#00687b] font-medium transition-colors "
                                >
                                    {t("login")}
                                </Link>
                                <Link
                                    to="/register"
                                    className="bg-gradient-to-br from-[#00687b] to-[#23b5d3] text-white px-8 py-3 rounded-xl font-semibold shadow-sm active:opacity-70 transition-all"
                                >
                                    {t("getStarted")}
                                </Link>
                            </>
                        ) : (
                            <>
                                <span className="text-sm font-semibold text-[#00687b]">
                                    {t("welcome")} {getDisplayName()}
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className="bg-slate-200 text-slate-800 px-5 py-2 rounded-xl font-medium hover:bg-slate-300 transition"
                                >
                                    {t("logout")}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            <main>
                <section className="relative px-8 pt-24 pb-32 overflow-hidden bg-blue-50">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="z-10">
                            <h1 className="text-[3.5rem] leading-[0.9] font-extrabold tracking-tight mb-8">
                                {t("connect")} {t("contribute")}
                                <br />
                                <span className="text-[#23b5d3]">{t("createRealImpact")}</span>
                            </h1>

                            <p className="text-lg text-gray-800 mb-12 max-w-lg leading-relaxed">
                                {t("joinNetwork")}
                            </p>

                            <div className="flex flex-wrap gap-4">
                                <Link
                                    to={!currentUser ? "/register" : "/explore"}
                                    className="bg-gradient-to-br from-[#00687b] to-[#23b5d3] text-white px-10 py-4 rounded-xl font-bold text-lg shadow-xl hover:-translate-y-[4px] transition-all"
                                >
                                    {t("joinVolunteer")}
                                </Link>

                                <Link
                                    to="/register"
                                    className="bg-[#beeaf7] text-[#416a76] px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-100 transition-all"
                                >
                                    {t("registerOrganization")}
                                </Link>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl rotate-3">
                                <img
                                    className="w-full h-full object-cover"
                                    src="../../image/volunteer_landingpage.jpg"
                                    alt="Volunteers working together"
                                />
                            </div>


                            {/* đây là đoạn sau này cần lấy dữ liệu thực tế */}
                            <div className="absolute -bottom-10 -left-10 bg-white/75 backdrop-blur-[20px] p-8 rounded-2xl shadow-xl max-w-xs -rotate-3 border-none">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-blue-200 rounded-full">
                                        <img className="w-8 h-8" src="..\..\image\heart.png" alt="heart" />
                                    </div>
                                    <span className="font-bold text-black">
                                        Community Growth
                                    </span>
                                </div>

                                <div className="h-3 w-full bg-[#a3cddb] rounded-full overflow-hidden">
                                    <div className="h-full bg-[#00687b] w-4/5 rounded-full"></div>
                                </div>

                                <p className="text-sm mt-3 text-[#3d494c]">
                                    80% of goals achieved this month
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-[#23b5d3]/10 rounded-full blur-[120px]"></div>
                </section>

                <section id="impact" className="scroll-mt-24 bg-gray-200 py-12 px-8">
                    <div className="max-w-7xl mx-auto flex flex-wrap justify-between gap-12">
                        <div className="flex-1 min-w-[200px] text-center md:text-left">
                            <div className="text-4xl font-black mb-2">24k+</div>
                            <div className="text-sm tracking-widest uppercase font-bold text-gray-700">
                                {t("activeVolunteers")}
                            </div>
                        </div>

                        <div className="flex-1 min-w-[200px] text-center md:text-left">
                            <div className="text-4xl font-black mb-2">1,200+</div>
                            <div className="text-sm tracking-widest uppercase font-bold text-gray-700">
                                {t("organizations")}
                            </div>
                        </div>

                        <div className="flex-1 min-w-[200px] text-center md:text-left">
                            <div className="text-4xl font-black mb-2">150k</div>
                            <div className="text-sm tracking-widest uppercase font-bold text-gray-700">
                                {t("impactHours")}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="about" className="scroll-mt-24 py-32 px-8 bg-blue-50">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-20 max-w-2xl">
                            <h2 className="text-3xl font-bold mb-6">
                                {t("premiumManagementEcosystem")}
                            </h2>
                            <p className="text-lg leading-relaxed text-gray-700">
                                {t("premiumManagementEcosystemDescription")}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            <div
                                id="explore"
                                className="scroll-mt-28 p-8 rounded-2xl bg-white hover:-translate-y-2 transition-all duration-300"
                            >
                                <img className="w-12 h-12" src="../../image/magnifier.png" />
                                <h3 className="text-xl font-bold mb-4 text-[#191c1d]">
                                    {t("findOpportunities")}
                                </h3>
                                <p className="text-gray-700 leading-relaxed">
                                    {t("findOpportunitiesDescription")}
                                </p>
                            </div>

                            <div
                                id="organizations"
                                className="scroll-mt-28 p-8 rounded-2xl bg-white hover:-translate-y-2 transition-all duration-300"
                            >
                                <img className="w-10 h-10" src="../../image/check.png" />
                                <h3 className="text-xl font-bold mb-4">
                                    {t("verifyOrganzation")}
                                </h3>
                                <p className="text-gray-700 leading-relaxed">
                                    {t("verifyOrganzationDescription")}
                                </p>
                            </div>

                            <div className="p-8 rounded-2xl bg-white hover:-translate-y-2 transition-all duration-300">
                                <img className="w-12 h-12" src="../../image/statistics.png" />
                                <h3 className="text-xl font-bold mb-4">
                                    {t("trackImpact")}
                                </h3>
                                <p className="text-gray-700 leading-relaxed">
                                    {t("trackImpactDescription")}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-15 px-8 overflow-hidden">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-20 items-center">
                        <div className="md:w-1/2">
                            <h2 className="text-4xl font-extrabold mb-8 text-[#191c1d] leading-tight">
                                {t("story")}
                            </h2>

                            <div className="space-y-12">
                                <blockquote className="relative">
                                    <span className="absolute -top-5 -left-5 text-6xl text-gray-600 font-serif leading-none">
                                        “
                                    </span>

                                    <p className="text-2xl font-medium text-gray-700 mb-6 leading-relaxed relative z-10 italic">
                                        {t("storyDescription")}
                                    </p>

                                    <span className="absolute -bottom-6 -right-5 text-6xl text-gray-600 font-serif">
                                        ”
                                    </span>
                                </blockquote>
                            </div>
                        </div>

                        <div className="md:w-1/2 grid grid-cols-2 gap-6">
                            <div className="space-y-6 translate-y-12">
                                <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-lg">
                                    <img
                                        className="w-full h-full object-cover"
                                        src="..\..\image\TinhNguyen_1.jpg"
                                        alt="Volunteer story 1"
                                    />
                                </div>

                                <div className="aspect-square rounded-2xl overflow-hidden shadow-lg">
                                    <img
                                        className="w-full h-full object-cover"
                                        src="..\..\image\TinhNguyen_2.jpg"
                                        alt="Volunteer story 2"
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="aspect-square rounded-2xl overflow-hidden shadow-lg">
                                    <img
                                        className="w-full h-full object-cover"
                                        src="..\..\image\TinhNguyen_3.jpg"
                                        alt="Volunteer story 3"
                                    />
                                </div>

                                <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-lg">
                                    <img
                                        className="w-full h-full object-cover"
                                        src="..\..\image\TinhNguyen_4.jpg"
                                        alt="Volunteer story 4"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-20 mt-10 bg-blue-50">
                    <div className="max-w-5xl mx-auto bg-gradient-to-br from-[#00687b] to-[#23b5d3] rounded-[2rem] p-16 text-center shadow-2xl relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-4xl font-extrabold text-white mb-8 leading-tight">
                                {t("readyToCurate")}
                            </h2>

                            <p className="text-white/80 text-xl mb-12 max-w-xl mx-auto leading-relaxed">
                                {t("readyToCurateDescription")}
                            </p>

                            <div className="flex flex-wrap justify-center gap-6">
                                <Link
                                    to={currentUser ? "/explore" : "/register"}
                                    className="bg-white text-[#00687b] px-10 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-slate-100 transition-all"
                                >
                                    {t("getStarted")}
                                </Link>
                            </div>
                        </div>

                        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute -top-20 -left-20 w-64 h-64 bg-black/5 rounded-full blur-3xl"></div>
                    </div>
                </section>
            </main>

            <footer className="w-full pt-20 pb-10 bg-[#f8f9fa] border-t border-[#bcc9cd]/15">
                <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="col-span-1 md:col-span-1">
                        <div className="text-xl font-bold text-[#191c1d] mb-6">
                            VolunteerHub
                        </div>
                        <p className="text-[#3d494c] text-sm tracking-wide leading-relaxed">
                            © 2024 VolunteerHub. The Digital Curator of Community Management.
                        </p>
                    </div>

                    <div>
                        <h5 className="font-bold text-[#191c1d] mb-6">Explore</h5>
                        <ul className="space-y-4">
                            <li>
                                <a
                                    className="text-[#3d494c] text-sm hover:text-[#23b5d3] transition-all duration-300"
                                    href="/explore"
                                >
                                    Browse Jobs
                                </a>
                            </li>
                            <li>
                                <a
                                    className="text-[#3d494c] text-sm hover:text-[#23b5d3] transition-all duration-300"
                                    href="#organizations"
                                >
                                    Organization Map
                                </a>
                            </li>
                            <li>
                                <a
                                    className="text-[#3d494c] text-sm hover:text-[#23b5d3] transition-all duration-300"
                                    href="#impact"
                                >
                                    Success Stories
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="font-bold text-[#191c1d] mb-6">Company</h5>
                        <ul className="space-y-4">
                            <li>
                                <a
                                    className="text-[#3d494c] text-sm hover:text-[#23b5d3] transition-all duration-300"
                                    href="#about"
                                >
                                    About Us
                                </a>
                            </li>
                            <li>
                                <a
                                    className="text-[#3d494c] text-sm hover:text-[#23b5d3] transition-all duration-300"
                                    href="#"
                                >
                                    Privacy Policy
                                </a>
                            </li>
                            <li>
                                <a
                                    className="text-[#3d494c] text-sm hover:text-[#23b5d3] transition-all duration-300"
                                    href="#"
                                >
                                    Terms of Service
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="font-bold text-[#191c1d] mb-6">Connect</h5>
                        <ul className="space-y-4">
                            <li>
                                <a
                                    className="text-[#3d494c] text-sm hover:text-[#23b5d3] transition-all duration-300"
                                    href="#"
                                >
                                    Contact Us
                                </a>
                            </li>
                            <li>
                                <a
                                    className="text-[#3d494c] text-sm hover:text-[#23b5d3] transition-all duration-300"
                                    href="#"
                                >
                                    Help Center
                                </a>
                            </li>
                            <li>
                                <a
                                    className="text-[#3d494c] text-sm hover:text-[#23b5d3] transition-all duration-300"
                                    href="#"
                                >
                                    Newsletter
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-8 mt-20 pt-8 border-t border-[#e7e8e9] flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex gap-6 text-[#3d494c]">
                        <span>🌐</span>
                        <span>💬</span>
                        <span>↗</span>
                    </div>

                    <div className="text-xs font-medium text-[#3d494c]">
                        Made with passion for the global community.
                    </div>
                </div>
            </footer>
        </div>
    );
}
