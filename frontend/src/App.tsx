import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import { LogOut, Moon, Sun } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import CourseDetail from './pages/CourseDetail';
import AssignmentDetail from './pages/AssignmentDetail';
import EvaluationView from './pages/EvaluationView';
import APIKeyManagement from './pages/APIKeyManagement';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const nextMode = theme === 'dark' ? 'light' : 'dark';

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem', maxWidth: '1400px' }}>
      <div className="navbar" style={{ borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <div className="nav-brand">ExamAI Eval</div>
          <button
            type="button"
            className="theme-toggle no-print"
            onClick={toggleTheme}
            title={`Switch to ${nextMode} mode`}
            aria-label={`Switch to ${nextMode} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
        <div className="nav-links">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--chip-bg)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)' }}>
            <span className={`badge ${user?.role === 'teacher' ? 'badge-secondary' : 'badge-primary'}`}>
              {user?.role?.toUpperCase()}
            </span>
            <span style={{ fontWeight: 500 }}>{user?.name}</span>
          </div>
          <button onClick={logout} className="btn" style={{ background: 'transparent', color: 'var(--color-text-secondary)', padding: '0.5rem' }} title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <Outlet />
    </div>
  );
};

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--color-text-secondary)' }}>Loading ExamAI...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="courses" />} />
        <Route path="courses" element={<CourseListWrapper />} />
        <Route path="course/:id" element={<CourseDetail />} />
        <Route path="assignment/:id" element={<AssignmentDetail />} />
        <Route path="evaluation/:id" element={<EvaluationView />} />
        <Route path="api-keys" element={<APIKeyManagement />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};

const CourseListWrapper = () => {
  const { user } = useAuth();
  return user?.role === 'teacher' ? <TeacherDashboard /> : <StudentDashboard />;
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
