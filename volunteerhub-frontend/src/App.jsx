import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ExplorePage from "./pages/ExplorePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ConfirmEmailResultPage from "./pages/ConfirmEmailResultPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import EventDetailPage from "./pages/EventDetailPage";
import VolunteerDashboardPage from "./pages/VolunteerDashboardPage";
import SponsorProjectsPage from "./pages/SponsorProjectsPage";
import OrganizerDashboardPage from "./pages/OrganizerDashboardPage";
import AdminPanelPage from "./pages/AdminPanelPage";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/confirm-email-result" element={<ConfirmEmailResultPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />

      <Route
        path="/sponsor/projects"
        element={
          <ProtectedRoute allowedRoles={["Sponsor"]}>
            <SponsorProjectsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/events/:id"
        element={
          <ProtectedRoute allowedRoles={["Volunteer"]}>
            <EventDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/volunteer/dashboard"
        element={
          <ProtectedRoute allowedRoles={["Volunteer"]}>
            <VolunteerDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organizer/dashboard"
        element={
          <ProtectedRoute allowedRoles={["Organizer"]}>
            <OrganizerDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/panel"
        element={
          <ProtectedRoute allowedRoles={["Admin"]}>
            <AdminPanelPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
