import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './styles/ThemeContext.jsx';
import { I18nProvider } from './i18n/I18nContext.jsx';
import { AuthProvider, useAuth } from './features/auth/AuthContext.jsx';
import { AppShell } from './components/layout/AppShell.jsx';
import { LoadingSkeleton } from './components/ui/DataState.jsx';
import { LoginPage } from './features/auth/LoginPage.jsx';
import { RegisterPage } from './features/auth/RegisterPage.jsx';
import { ForgotPasswordPage, ResetPasswordPage } from './features/auth/PasswordResetPages.jsx';
import { DashboardPage } from './features/dashboard/DashboardPage.jsx';
import { ProjectsPage } from './features/projects/ProjectsPage.jsx';
import { ProjectDetailPage } from './features/projects/ProjectDetailPage.jsx';
import { KanbanPage } from './features/tasks/KanbanPage.jsx';
import { MyTasksPage } from './features/tasks/MyTasksPage.jsx';
import { CalendarPage } from './features/calendar/CalendarPage.jsx';
import { TimelinePage } from './features/timeline/TimelinePage.jsx';
import { ReportsPage } from './features/reports/ReportsPage.jsx';
import { TeamPage } from './features/team/TeamPage.jsx';
import { NotificationsPage } from './features/notifications/NotificationsPage.jsx';
import { SettingsPage } from './features/settings/SettingsPage.jsx';

function ProtectedShell({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-[#F8FAFC] dark:bg-[#0B1120]">
        <div className="max-w-4xl mx-auto">
          <LoadingSkeleton rows={6} />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <AppShell>{children}</AppShell>;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
              <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
              <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
              <Route path="/reset-password" element={<PublicOnlyRoute><ResetPasswordPage /></PublicOnlyRoute>} />

              <Route path="/" element={<ProtectedShell><DashboardPage /></ProtectedShell>} />
              <Route path="/projects" element={<ProtectedShell><ProjectsPage /></ProtectedShell>} />
              <Route path="/projects/:projectId" element={<ProtectedShell><ProjectDetailPage /></ProtectedShell>} />
              <Route path="/tasks" element={<ProtectedShell><MyTasksPage /></ProtectedShell>} />
              <Route path="/kanban" element={<ProtectedShell><KanbanPage /></ProtectedShell>} />
              <Route path="/calendar" element={<ProtectedShell><CalendarPage /></ProtectedShell>} />
              <Route path="/timeline" element={<ProtectedShell><TimelinePage /></ProtectedShell>} />
              <Route path="/reports" element={<ProtectedShell><ReportsPage /></ProtectedShell>} />
              <Route
                path="/team"
                element={
                  <ProtectedShell allowedRoles={['ADMIN', 'PROJECT_MANAGER']}>
                    <TeamPage />
                  </ProtectedShell>
                }
              />
              <Route path="/notifications" element={<ProtectedShell><NotificationsPage /></ProtectedShell>} />
              <Route path="/settings" element={<ProtectedShell><SettingsPage /></ProtectedShell>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
