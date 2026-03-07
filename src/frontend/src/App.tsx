import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navbar from './components/layout/Navbar';
import GridOverlay from './components/layout/GridOverlay';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import SeekerDashboard from './pages/SeekerDashboard';
import ReskillCalendar from './pages/ReskillCalendar';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import HiringDashboard from './pages/HiringDashboard';
import ProtectedRoute from './components/shared/ProtectedRoute';
import { useAuthStore } from './stores/authStore';

const KnowledgeGraph = lazy(() => import('./pages/KnowledgeGraph.tsx'));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-mirage-teal animate-pulse-teal text-lg">Loading...</div>
    </div>
  );
}

function AppRoutes() {
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/hiring" element={<HiringDashboard />} />

        {/* Auth required */}
        <Route path="/onboarding" element={
          <ProtectedRoute><Onboarding /></ProtectedRoute>
        } />
        <Route path="/seeker" element={
          <ProtectedRoute requireOnboarding><SeekerDashboard /></ProtectedRoute>
        } />
        <Route path="/reskill/:jobId" element={
          <ProtectedRoute requireOnboarding><ReskillCalendar /></ProtectedRoute>
        } />
        <Route path="/graph" element={
          <ProtectedRoute><KnowledgeGraph /></ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute requireOnboarding><Chat /></ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute><Settings /></ProtectedRoute>
        } />

        {/* Redirects */}
        <Route path="/worker" element={<Navigate to="/seeker" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-mirage-bg text-white font-body relative">
          <GridOverlay />
          <Navbar />
          <main className="relative z-10">
            <AppRoutes />
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
