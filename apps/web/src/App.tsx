import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'

// Layouts
import { AuthLayout } from '@/components/layout/AuthLayout'
import { SindicoLayout } from '@/components/layout/SindicoLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { MotoristaLayout } from '@/components/layout/MotoristaLayout'

// Auth
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { PendingPage } from '@/pages/auth/PendingPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'

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
import { AdminMotoristasPage } from '@/pages/admin/AdminMotoristasPage'
import { AdminRoutesPage } from '@/pages/admin/AdminRoutesPage'
import { AdminConfigPage } from '@/pages/admin/AdminConfigPage'

// Motorista
import { MotoristaDashboardPage } from '@/pages/motorista/MotoristaDashboardPage'
import { MotoristaRidesPage } from '@/pages/motorista/MotoristaRidesPage'
import { MotoristaActiveRidePage } from '@/pages/motorista/MotoristaActiveRidePage'
import { MotoristaProfilePage } from '@/pages/motorista/MotoristaProfilePage'

// ── Guards ─────────────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />
  return <>{children}</>
}

function RequireSindico({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'SINDICO') return <Navigate to="/" replace />
  return <>{children}</>
}

function RequireMotorista({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'MOTORISTA') return <Navigate to="/" replace />
  return <>{children}</>
}

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        {/* Auth */}
        <Route element={<AuthLayout />}>
          <Route path="/login"                    element={<LoginPage />} />
          <Route path="/cadastro"                 element={<RegisterPage />} />
          <Route path="/pendente"                 element={<PendingPage />} />
          <Route path="/esqueci-senha"             element={<ForgotPasswordPage />} />
          <Route path="/redefinir-senha/:token"   element={<ResetPasswordPage />} />
        </Route>

        {/* Síndico */}
        <Route element={
          <RequireAuth><RequireSindico><SindicoLayout /></RequireSindico></RequireAuth>
        }>
          <Route path="/dashboard"     element={<DashboardPage />} />
          <Route path="/corridas/nova" element={<NewRidePage />} />
          <Route path="/corridas/:id"  element={<RideTrackingPage />} />
          <Route path="/corridas"      element={<RideHistoryPage />} />
          <Route path="/rotas"         element={<RoutesPage />} />
          <Route path="/perfil"        element={<ProfilePage />} />
        </Route>

        {/* Motorista */}
        <Route element={
          <RequireAuth><RequireMotorista><MotoristaLayout /></RequireMotorista></RequireAuth>
        }>
          <Route path="/motorista"         element={<MotoristaDashboardPage />} />
          <Route path="/motorista/corridas" element={<MotoristaRidesPage />} />
          <Route path="/motorista/ativa"   element={<MotoristaActiveRidePage />} />
          <Route path="/motorista/perfil"  element={<MotoristaProfilePage />} />
        </Route>

        {/* Admin */}
        <Route element={
          <RequireAuth><RequireAdmin><AdminLayout /></RequireAdmin></RequireAuth>
        }>
          <Route path="/admin"              element={<AdminDashboardPage />} />
          <Route path="/admin/corridas"    element={<AdminRidesPage />} />
          <Route path="/admin/sindicos"    element={<AdminSindicosPage />} />
          <Route path="/admin/motoristas"  element={<AdminMotoristasPage />} />
          <Route path="/admin/rotas"       element={<AdminRoutesPage />} />
          <Route path="/admin/config"      element={<AdminConfigPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function RootRedirect() {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (user?.role === 'ADMIN')     return <Navigate to="/admin" replace />
  if (user?.role === 'MOTORISTA') return <Navigate to="/motorista" replace />
  return <Navigate to="/dashboard" replace />
}
