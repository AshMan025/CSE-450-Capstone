import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import { LogOut } from 'lucide-react';

const DashboardLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem', maxWidth: '1400px' }}>
      <div className="navbar" style={{ borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}>
        <div className="nav-brand">ExamAI Eval</div>
        <div className="nav-links">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)' }}>
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

      {user?.role === 'teacher' ? <TeacherDashboard /> : <StudentDashboard />}
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
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
