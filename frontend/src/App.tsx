import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RequestsListPage from './pages/RequestsListPage';
import CreateRequestPage from './pages/CreateRequestPage';
import RequestDetailPage from './pages/RequestDetailPage';
import EpisodesPage from './pages/EpisodesPage';
import ImportPage from './pages/ImportPage';
import AnalyticsPage from './pages/AnalyticsPage';
import UsersPage from './pages/UsersPage';
import { PageSpinner } from './components/Shared';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <Routes>
      {/* Root redirect */}
      <Route
        path="/"
        element={<Navigate to={user ? '/app' : '/login'} replace />}
      />

      {/* Login page */}
      <Route
        path="/login"
        element={user ? <Navigate to="/app" replace /> : <LoginPage />}
      />

      {/* Protected App Routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="requests" element={<RequestsListPage />} />
        <Route
          path="requests/new"
          element={
            <ProtectedRoute allowedRoles={['client', 'admin']}>
              <CreateRequestPage />
            </ProtectedRoute>
          }
        />
        <Route path="requests/:id" element={<RequestDetailPage />} />
        <Route
          path="episodes"
          element={
            <ProtectedRoute allowedRoles={['operator', 'admin']}>
              <EpisodesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="import"
          element={
            <ProtectedRoute allowedRoles={['operator', 'admin']}>
              <ImportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="analytics"
          element={
            <ProtectedRoute allowedRoles={['operator', 'admin']}>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all 404 */}
      <Route
        path="*"
        element={
          <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">404</h1>
            <p className="text-gray-600 mb-6">The page you were looking for does not exist.</p>
            <a
              href="/app"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm transition-colors"
            >
              Return to Dashboard
            </a>
          </div>
        }
      />
    </Routes>
  );
}
