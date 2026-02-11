import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { apiGet } from '@/lib/api';
import { AppLayout } from '@/components/layout/AppLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { ProtectedRoute, AdminRoute } from '@/components/auth/ProtectedRoute';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy loaded pages
const HomePage = lazy(() => import('@/features/home/HomePage'));
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/features/auth/VerifyEmailPage'));
const GameDashboard = lazy(() => import('@/features/game/GameDashboard'));
const MyPlansPage = lazy(() => import('@/features/battleplan/MyPlansPage'));
const PublicPlansPage = lazy(() => import('@/features/battleplan/PublicPlansPage'));
const BattleplanViewer = lazy(() => import('@/features/battleplan/BattleplanViewer'));
const CreateRoomPage = lazy(() => import('@/features/room/CreateRoomPage'));
const RoomPage = lazy(() => import('@/features/room/RoomPage'));
const AdminDashboard = lazy(() => import('@/features/admin/DashboardPage'));
const AdminGames = lazy(() => import('@/features/admin/games/GamesPage'));
const AdminGameMaps = lazy(() => import('@/features/admin/maps/MapsPage'));
const AdminGameOperators = lazy(() => import('@/features/admin/operators/OperatorsPage'));
const AdminGameGadgets = lazy(() => import('@/features/admin/gadgets/GadgetsPage'));
const AdminUsers = lazy(() => import('@/features/admin/users/UsersPage'));
const AdminTokens = lazy(() => import('@/features/admin/tokens/TokensPage'));
const AdminSettings = lazy(() => import('@/features/admin/settings/SettingsPage'));
const ImpressumPage = lazy(() => import('@/features/legal/ImpressumPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Skeleton className="h-8 w-48" />
    </div>
  );
}

export function App() {
  const { setAuth } = useAuthStore();

  useEffect(() => {
    // Try to restore session on load
    apiGet<{ data: { user: any; accessToken: string } }>('/auth/refresh')
      .then((res) => {
        if (res.data) {
          setAuth(res.data.user, res.data.accessToken);
        }
      })
      .catch(() => {
        // Not authenticated
      });
  }, []);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth pages */}
        <Route element={<AuthLayout />}>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/auth/verify-email/:token" element={<VerifyEmailPage />} />
        </Route>

        {/* Main app */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/impressum" element={<ImpressumPage />} />
          <Route path="/:gameSlug" element={<GameDashboard />} />
          <Route path="/:gameSlug/plans/public" element={<PublicPlansPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/:gameSlug/plans" element={<MyPlansPage />} />
            <Route path="/:gameSlug/plans/:planId" element={<BattleplanViewer />} />
            <Route path="/room/create" element={<CreateRoomPage />} />
          </Route>

          {/* Admin routes */}
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/games" element={<AdminGames />} />
              <Route path="/admin/games/:id/maps" element={<AdminGameMaps />} />
              <Route path="/admin/games/:id/operators" element={<AdminGameOperators />} />
              <Route path="/admin/games/:id/gadgets" element={<AdminGameGadgets />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/tokens" element={<AdminTokens />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>
          </Route>
        </Route>

        {/* Room (full-screen, no layout) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/room/:connectionString" element={<RoomPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
