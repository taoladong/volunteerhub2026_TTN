import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/layouts/MainLayout';
import PublicLayout from './components/layouts/PublicLayout';
import SharedLayout from './components/layouts/SharedLayout';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/ui/LoadingSpinner';

const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const EventList = lazy(() => import('./pages/public/EventList'));
const EventDetail = lazy(() => import('./pages/public/EventDetail'));
const VerifyCertificate = lazy(() => import('./pages/public/VerifyCertificate'));
const Channel = lazy(() => import('./pages/shared/Channel'));
const PublicProfile = lazy(() => import('./pages/shared/PublicProfile'));
const Profile = lazy(() => import('./pages/volunteer/Profile'));
const Activity = lazy(() => import('./pages/volunteer/Activity'));
const Achievements = lazy(() => import('./pages/volunteer/Achievements'));
const MyEvents = lazy(() => import('./pages/organizer/MyEvents'));
const EventForm = lazy(() => import('./pages/organizer/EventForm'));
const ManageEvent = lazy(() => import('./pages/organizer/ManageEvent/index'));
const OrganizerInsights = lazy(() => import('./pages/organizer/OrganizerInsights'));
const AdminEvents = lazy(() => import('./pages/admin/AdminEvents'));
const AdminRatings = lazy(() => import('./pages/admin/AdminRatings'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <LoadingSpinner />
  </div>
);

const AppPage = ({ children, roles }) => (
  <ProtectedRoute roles={roles}>
    <MainLayout>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </ErrorBoundary>
    </MainLayout>
  </ProtectedRoute>
);

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />
        <Route path="/events" element={<SharedLayout><EventList /></SharedLayout>} />
        <Route path="/events/:id" element={<SharedLayout><EventDetail /></SharedLayout>} />
        <Route path="/verify/:code" element={<PublicLayout><VerifyCertificate /></PublicLayout>} />
        <Route path="/verify/check" element={<PublicLayout><VerifyCertificate /></PublicLayout>} />

        <Route path="/channels/:id" element={<AppPage><Channel /></AppPage>} />
        <Route path="/profile/:userId" element={<AppPage><PublicProfile /></AppPage>} />
        <Route path="/profile" element={<AppPage roles={['Volunteer']}><Profile /></AppPage>} />
        <Route path="/activity" element={<AppPage roles={['Volunteer']}><Activity /></AppPage>} />
        <Route path="/my-registrations" element={<Navigate to="/activity" replace />} />
        <Route path="/achievements" element={<AppPage roles={['Volunteer']}><Achievements /></AppPage>} />
        <Route path="/my-badges" element={<Navigate to="/achievements" replace />} />
        <Route path="/my-certificates" element={<Navigate to="/achievements?tab=certificates" replace />} />

        <Route path="/my-events" element={<AppPage roles={['Organizer']}><MyEvents /></AppPage>} />
        <Route path="/events/create" element={<AppPage roles={['Organizer']}><EventForm /></AppPage>} />
        <Route path="/events/:id/edit" element={<AppPage roles={['Organizer']}><EventForm /></AppPage>} />
        <Route path="/events/:id/manage" element={<AppPage roles={['Organizer']}><ManageEvent /></AppPage>} />
        <Route path="/organizer/insights" element={<AppPage roles={['Organizer']}><OrganizerInsights /></AppPage>} />

        <Route path="/admin/events" element={<AppPage roles={['Admin']}><AdminEvents /></AppPage>} />
        <Route path="/admin/ratings" element={<AppPage roles={['Admin']}><AdminRatings /></AppPage>} />

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
