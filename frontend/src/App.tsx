import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/Login';
import { SignupPage } from './pages/Signup';
import { VerifyCertificatePage } from './pages/VerifyCertificate';
import { AdminDashboard } from './pages/AdminDashboard';
import { TrainerDashboard } from './pages/TrainerDashboard';
import { TraineeDashboard } from './pages/TraineeDashboard';

function RootRedirect() {
  const { currentUser, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-slate-400">Loading LearnBridge...</p>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  switch (currentUser.role) {
    case 'ADMIN':
      return <Navigate to="/admin" replace />;
    case 'TRAINER':
      return <Navigate to="/trainer" replace />;
    case 'TRAINEE':
      return <Navigate to="/trainee" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-certificate" element={<VerifyCertificatePage />} />

          {/* Role-Based Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer"
            element={
              <ProtectedRoute allowedRoles={['TRAINER', 'ADMIN']}>
                <TrainerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainee"
            element={
              <ProtectedRoute allowedRoles={['TRAINEE', 'ADMIN']}>
                <TraineeDashboard />
              </ProtectedRoute>
            }
          />

          {/* Legacy /dashboard route redirects to the correct role dashboard */}
          <Route path="/dashboard" element={<RootRedirect />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
