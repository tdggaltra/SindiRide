import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'

// Layouts
import { AuthLayout } from '@/components/layout/AuthLayout'
import { SindicoLayout } from '@/components/layout/SindicoLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'

// Auth
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { PendingPage } from '@/pages/auth/PendingPage'

// Síndico
import { DashboardPage } from '@/pages/sindico/DashboardPage'
import { NewRidePage } from '@/pages/sindico/NewRidePage'
import { RideTrackingPage } from '@/pages/sindico/RideTrackingPage'
import { RideHistoryPage } from '@/pages/sindico/RideHistoryPage'
import { ProfilePage } from '@/pages/sindico/ProfilePage'
import { RoutesPage } from '@/pages/sindico/RoutesPage'

// Admin
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminSindicosPage } from '@/pages/admin/AdminSindicosPage'
import { AdminRidesPage } from '@/pages/admin/AdminRidesPage'

// Guards
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function RequireSindico({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota raiz — redireciona conforme role */}
        <Route path="/" element={<RootRedirect />} />

        {/* Auth — sem layout de sidebar */}
        <Route element={<AuthLayout />}>
          <Route path="/login"   element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route path="/pendente" element={<PendingPage />} />
        </Route>

        {/* Síndico */}
        <Route element={
          <RequireAuth><RequireSindico><SindicoLayout /></RequireSindico></RequireAuth>
        }>
          <Route path="/dashboard"        element={<DashboardPage />} />
          <Route path="/corridas/nova"    element={<NewRidePage />} />
          <Route path="/corridas/:id"     element={<RideTrackingPage />} />
          <Route path="/corridas"         element={<RideHistoryPage />} />
          <Route path="/rotas"            element={<RoutesPage />} />
          <Route path="/perfil"           element={<ProfilePage />} />
        </Route>

        {/* Admin */}
        <Route element={
          <RequireAuth><RequireAdmin><AdminLayout /></RequireAdmin></RequireAuth>
        }>
          <Route path="/admin"             element={<AdminDashboardPage />} />
          <Route path="/admin/sindicos"    element={<AdminSindicosPage />} />
          <Route path="/admin/corridas"    element={<AdminRidesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function RootRedirect() {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />
  return <Navigate to="/dashboard" replace />
}
