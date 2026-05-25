import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/layouts/MainLayout';
import Loading from './components/common/Loading';
import { getDefaultRouteByRole } from './utils/navigation';

// Auth pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));

// Volunteer pages
const VolunteerDashboard = lazy(() => import('./pages/volunteer/VolunteerDashboard'));
const EventSearch = lazy(() => import('./pages/volunteer/EventSearch'));
const MyRegistrations = lazy(() => import('./pages/volunteer/MyRegistrations'));
const MyDonations = lazy(() => import('./pages/volunteer/MyDonations'));
const VolunteerProfile = lazy(() => import('./pages/volunteer/VolunteerProfile'));
const VolunteerPassport = lazy(() => import('./pages/volunteer/VolunteerPassport'));

// Organizer pages
const OrganizerDashboard = lazy(() => import('./pages/organizer/OrganizerDashboard'));
const EventManagement = lazy(() => import('./pages/organizer/EventManagement'));
const RegistrationAttendance = lazy(() => import('./pages/organizer/RegistrationAttendance'));
const OrganizerVerification = lazy(() => import('./pages/organizer/OrganizerVerification'));
const OrganizerSponsorship = lazy(() => import('./pages/organizer/OrganizerSponsorship'));
const OrganizerCampaigns = lazy(() => import('./pages/organizer/OrganizerCampaigns'));

// Sponsor pages
const SponsorDashboard = lazy(() => import('./pages/sponsor/SponsorDashboard'));
const SponsorshipDonation = lazy(() => import('./pages/sponsor/SponsorshipDonation'));
const SponsorProfile = lazy(() => import('./pages/sponsor/SponsorProfile'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminVerification = lazy(() => import('./pages/admin/AdminVerification'));
const AdminFinance = lazy(() => import('./pages/admin/AdminFinance'));
const AdminSystem = lazy(() => import('./pages/admin/AdminSystem'));
const AdminEvents = lazy(() => import('./pages/admin/AdminEvents'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminRatings = lazy(() => import('./pages/admin/AdminRatings'));

// Shared pages
const EventDetail = lazy(() => import('./pages/shared/EventDetail'));
const Channel = lazy(() => import('./pages/shared/Channel'));
const Notifications = lazy(() => import('./pages/shared/Notifications'));
const CertificateVerify = lazy(() => import('./pages/shared/CertificateVerify'));

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <Loading />;
  if (isAuthenticated) return <Navigate to={getDefaultRouteByRole(user)} replace />;
  return children;
};

const HomeRoute = () => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <Loading />;
  return <Navigate to={isAuthenticated ? getDefaultRouteByRole(user) : '/dang-nhap'} replace />;
};

const AppPage = ({ children, roles }) => (
  <ProtectedRoute roles={roles}>
    <MainLayout>
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </MainLayout>
  </ProtectedRoute>
);

function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Auth */}
        <Route path="/dang-nhap" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/dang-ky" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Volunteer */}
        <Route path="/tinh-nguyen" element={<AppPage roles={['Volunteer']}><VolunteerDashboard /></AppPage>} />
        <Route path="/su-kien" element={<AppPage><EventSearch /></AppPage>} />
        <Route path="/su-kien/:id" element={<AppPage><EventDetail /></AppPage>} />
        <Route path="/dang-ky-cua-toi" element={<AppPage roles={['Volunteer']}><MyRegistrations /></AppPage>} />
        <Route path="/ung-ho-cua-toi" element={<AppPage roles={['Volunteer']}><MyDonations /></AppPage>} />
        <Route path="/ho-so" element={<AppPage roles={['Volunteer']}><VolunteerProfile /></AppPage>} />
        <Route path="/ho-so/passport" element={<AppPage roles={['Volunteer']}><VolunteerPassport /></AppPage>} />

        {/* Organizer */}
        <Route path="/to-chuc" element={<AppPage roles={['Organizer']}><OrganizerDashboard /></AppPage>} />
        <Route path="/quan-ly-su-kien" element={<AppPage roles={['Organizer']}><EventManagement /></AppPage>} />
        <Route path="/dang-ky-diem-danh" element={<AppPage roles={['Organizer']}><RegistrationAttendance /></AppPage>} />
        <Route path="/to-chuc/tai-tro" element={<AppPage roles={['Organizer']}><OrganizerSponsorship /></AppPage>} />
        <Route path="/to-chuc/chien-dich" element={<AppPage roles={['Organizer']}><OrganizerCampaigns /></AppPage>} />
        <Route path="/xac-minh-to-chuc" element={<AppPage roles={['Organizer']}><OrganizerVerification /></AppPage>} />

        {/* Sponsor */}
        <Route path="/tai-tro" element={<AppPage roles={['Sponsor']}><SponsorDashboard /></AppPage>} />
        <Route path="/tai-tro-quyen-gop" element={<AppPage roles={['Sponsor']}><SponsorshipDonation /></AppPage>} />
        <Route path="/ho-so-tai-tro" element={<AppPage roles={['Sponsor']}><SponsorProfile /></AppPage>} />

        {/* Admin */}
        <Route path="/quan-tri" element={<AppPage roles={['Admin']}><AdminDashboard /></AppPage>} />
        <Route path="/quan-tri/nguoi-dung" element={<AppPage roles={['Admin']}><AdminUsers /></AppPage>} />
        <Route path="/quan-tri/su-kien" element={<AppPage roles={['Admin']}><AdminEvents /></AppPage>} />
        <Route path="/quan-tri/xac-minh" element={<AppPage roles={['Admin']}><AdminVerification /></AppPage>} />
        <Route path="/quan-tri/tai-chinh" element={<AppPage roles={['Admin']}><AdminFinance /></AppPage>} />
        <Route path="/quan-tri/danh-muc" element={<AppPage roles={['Admin']}><AdminCategories /></AppPage>} />
        <Route path="/quan-tri/danh-gia" element={<AppPage roles={['Admin']}><AdminRatings /></AppPage>} />
        <Route path="/quan-tri/he-thong" element={<AppPage roles={['Admin']}><AdminSystem /></AppPage>} />

        {/* Shared */}
        <Route path="/kenh-giao-tiep" element={<AppPage><Channel /></AppPage>} />
        <Route path="/thong-bao" element={<AppPage><Notifications /></AppPage>} />
        <Route path="/xac-thuc-chung-nhan" element={<AppPage><CertificateVerify /></AppPage>} />

        {/* Redirect */}
        <Route path="/" element={<HomeRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}