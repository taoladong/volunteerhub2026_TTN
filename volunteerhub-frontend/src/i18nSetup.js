import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
    en: {
        translation: {
            explore: "Explore",
            organizations: "Organizations",
            impact: "Impact",
            about: "About",
            login: "Log In",
            getStarted: "Get Started",
            logout: "Logout",
            welcome: "Welcome",
            connect: "Connect.",
            contribute: "Contribute.",
            createRealImpact: "Create Real Impact.",
            joinNetwork:
                "Join a network that connects volunteers with high-impact organizations through a clearer and more operational experience.",
            joinVolunteer: "Join as Volunteer",
            registerOrganization: "Register Organization",
            languageVietnamese: "VI",
            languageEnglish: "EN",
            activeVolunteers: "Active Volunteers",
            impactHours: "Impact Hours",
            premiumManagementEcosystem: "Operational Volunteer Platform",
            premiumManagementEcosystemDescription:
                "The platform emphasizes clear data, trusted organizations, and measurable contribution records.",
            findOpportunities: "Find Opportunities",
            findOpportunitiesDescription:
                "Search approved opportunities that match your skills and availability.",
            verifyOrganzation: "Verify Organization",
            verifyOrganzationDescription:
                "Work with organizations that are reviewed for transparency and execution quality.",
            trackImpact: "Track Impact",
            trackImpactDescription:
                "Measure contribution history, volunteer hours, and certifications.",
            story: "Stories from the Network",
            storyDescription:
                "Volunteer work becomes more effective when event data, registrations, and follow-up records are handled consistently.",
            readyToCurate: "Ready to contribute?",
            readyToCurateDescription:
                "Join the network and work from real event data instead of disconnected channels.",
        },
    },
    vi: {
        translation: {
            explore: "Khám phá",
            organizations: "Tổ chức",
            impact: "Tác động",
            about: "Giới thiệu",
            login: "Đăng nhập",
            getStarted: "Bắt đầu",
            logout: "Đăng xuất",
            welcome: "Xin chào",
            connect: "Kết nối.",
            contribute: "Cống hiến.",
            createRealImpact: "Tạo tác động thật.",
            joinNetwork:
                "Tham gia mạng lưới kết nối tình nguyện viên với các tổ chức tạo tác động cao qua một trải nghiệm vận hành rõ ràng hơn.",
            joinVolunteer: "Trở thành tình nguyện viên",
            registerOrganization: "Đăng ký tổ chức",
            languageVietnamese: "VI",
            languageEnglish: "EN",
            activeVolunteers: "Tình nguyện viên hoạt động",
            impactHours: "Số giờ đóng góp",
            premiumManagementEcosystem: "Nền tảng vận hành tình nguyện",
            premiumManagementEcosystemDescription:
                "Hệ thống tập trung vào dữ liệu rõ ràng, tổ chức đáng tin cậy và hồ sơ đóng góp có thể đo lường.",
            findOpportunities: "Tìm cơ hội",
            findOpportunitiesDescription:
                "Tìm các cơ hội đã được duyệt phù hợp với kỹ năng và thời gian của bạn.",
            verifyOrganzation: "Xác minh tổ chức",
            verifyOrganzationDescription:
                "Làm việc với các tổ chức đã được rà soát về minh bạch và chất lượng vận hành.",
            trackImpact: "Theo dõi tác động",
            trackImpactDescription:
                "Đo lịch sử đóng góp, giờ tình nguyện và chứng nhận của bạn.",
            story: "Câu chuyện từ mạng lưới",
            storyDescription:
                "Hoạt động tình nguyện hiệu quả hơn khi dữ liệu sự kiện, đăng ký tham gia và kết quả sau sự kiện được quản lý nhất quán.",
            readyToCurate: "Sẵn sàng tham gia?",
            readyToCurateDescription:
                "Gia nhập mạng lưới và làm việc với dữ liệu sự kiện thật thay vì các kênh rời rạc.",
        },
    },
};

i18n.use(initReactI18next).init({
    resources,
    lng: localStorage.getItem("lang") || "vi",
    fallbackLng: "vi",
    interpolation: {
        escapeValue: false,
    },
});

export default i18n;
