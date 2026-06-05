import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/layouts/MainLayout';
import PublicLayout from './components/layouts/PublicLayout';
import { getDefaultRouteByRole } from './utils/navigation';

const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const EventList = lazy(() => import('./pages/public/EventList'));
const EventDetail = lazy(() => import('./pages/public/EventDetail'));
const VerifyCertificate = lazy(() => import('./pages/public/VerifyCertificate'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Channel = lazy(() => import('./pages/shared/Channel'));
const PublicProfile = lazy(() => import('./pages/shared/PublicProfile'));
const MyProfile = lazy(() => import('./pages/volunteer/MyProfile'));
const Passport = lazy(() => import('./pages/volunteer/Passport'));
const MyRegistrations = lazy(() => import('./pages/volunteer/MyRegistrations'));
const MyDonations = lazy(() => import('./pages/volunteer/MyDonations'));
const MyBadges = lazy(() => import('./pages/volunteer/MyBadges'));
const MyCertificates = lazy(() => import('./pages/volunteer/MyCertificates'));
const MyEvents = lazy(() => import('./pages/organizer/MyEvents'));
const EventForm = lazy(() => import('./pages/organizer/EventForm'));
const ManageEvent = lazy(() => import('./pages/organizer/ManageEvent'));
const OrganizerVerification = lazy(() => import('./pages/organizer/OrganizerVerification'));
const OrganizerInsights = lazy(() => import('./pages/organizer/OrganizerInsights'));
const MySponsorships = lazy(() => import('./pages/sponsor/MySponsorships'));
const SponsorProfile = lazy(() => import('./pages/sponsor/SponsorProfile'));
const AdminEvents = lazy(() => import('./pages/admin/AdminEvents'));
const AdminOrganizerVerifications = lazy(() => import('./pages/admin/AdminOrganizerVerifications'));
const AdminVolunteerVerifications = lazy(() => import('./pages/admin/AdminVolunteerVerifications'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminSkills = lazy(() => import('./pages/admin/AdminSkills'));
const AdminRatings = lazy(() => import('./pages/admin/AdminRatings'));
const AdminExport = lazy(() => import('./pages/admin/AdminExport'));
const AdminMonitoring = lazy(() => import('./pages/admin/AdminMonitoring'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to={getDefaultRouteByRole(user?.role)} replace />;

  return children;
};

const AppPage = ({ children, roles }) => (
  <ProtectedRoute roles={roles}>
    <MainLayout>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </MainLayout>
  </ProtectedRoute>
);

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />
        <Route path="/events" element={<PublicLayout><EventList /></PublicLayout>} />
        <Route path="/events/:id" element={<PublicLayout><EventDetail /></PublicLayout>} />
        <Route path="/verify/:code" element={<PublicLayout><VerifyCertificate /></PublicLayout>} />
        <Route path="/verify/check" element={<PublicLayout><VerifyCertificate /></PublicLayout>} />

        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        <Route path="/dashboard" element={<AppPage><Dashboard /></AppPage>} />
        <Route path="/notifications" element={<AppPage><Notifications /></AppPage>} />
        <Route path="/channels/:id" element={<AppPage><Channel /></AppPage>} />

        <Route path="/profile" element={<AppPage roles={['Volunteer']}><MyProfile /></AppPage>} />
        <Route path="/profile/passport" element={<AppPage roles={['Volunteer']}><Passport /></AppPage>} />
        <Route path="/profile/:userId" element={<AppPage><PublicProfile /></AppPage>} />
        <Route path="/my-registrations" element={<AppPage roles={['Volunteer']}><MyRegistrations /></AppPage>} />
        <Route path="/my-donations" element={<AppPage roles={['Volunteer']}><MyDonations /></AppPage>} />
        <Route path="/my-badges" element={<AppPage roles={['Volunteer']}><MyBadges /></AppPage>} />
        <Route path="/my-certificates" element={<AppPage roles={['Volunteer']}><MyCertificates /></AppPage>} />

        <Route path="/my-events" element={<AppPage roles={['Organizer']}><MyEvents /></AppPage>} />
        <Route path="/events/create" element={<AppPage roles={['Organizer']}><EventForm /></AppPage>} />
        <Route path="/events/:id/edit" element={<AppPage roles={['Organizer']}><EventForm /></AppPage>} />
        <Route path="/events/:id/manage" element={<AppPage roles={['Organizer']}><ManageEvent /></AppPage>} />
        <Route path="/organizer/verification" element={<AppPage roles={['Organizer']}><OrganizerVerification /></AppPage>} />
        <Route path="/organizer/insights" element={<AppPage roles={['Organizer']}><OrganizerInsights /></AppPage>} />

        <Route path="/my-sponsorships" element={<AppPage roles={['Sponsor']}><MySponsorships /></AppPage>} />
        <Route path="/sponsor/profile" element={<AppPage roles={['Sponsor']}><SponsorProfile /></AppPage>} />

        <Route path="/admin/events" element={<AppPage roles={['Admin']}><AdminEvents /></AppPage>} />
        <Route path="/admin/organizer-verifications" element={<AppPage roles={['Admin']}><AdminOrganizerVerifications /></AppPage>} />
        <Route path="/admin/volunteer-verifications" element={<AppPage roles={['Admin']}><AdminVolunteerVerifications /></AppPage>} />
        <Route path="/admin/users" element={<AppPage roles={['Admin']}><AdminUsers /></AppPage>} />
        <Route path="/admin/categories" element={<AppPage roles={['Admin']}><AdminCategories /></AppPage>} />
        <Route path="/admin/skills" element={<AppPage roles={['Admin']}><AdminSkills /></AppPage>} />
        <Route path="/admin/ratings" element={<AppPage roles={['Admin']}><AdminRatings /></AppPage>} />
        <Route path="/admin/monitoring" element={<AppPage roles={['Admin']}><AdminMonitoring /></AppPage>} />
        <Route path="/admin/export" element={<AppPage roles={['Admin']}><AdminExport /></AppPage>} />

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
