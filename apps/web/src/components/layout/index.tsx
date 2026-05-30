import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Car, Home, Calendar, Map, User, LayoutDashboard, Users, Settings, LogOut, Bell } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useLogout, useNotifications } from '@/hooks'

// ── AuthLayout ─────────────────────────────────────────────────────────────
export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
            <Car className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-medium text-gray-900">
            Sindi<span className="text-brand-600">Ride</span>
          </span>
        </div>
        <Outlet />
      </div>
    </div>
  )
}

// ── SindicoLayout — bottom nav mobile ─────────────────────────────────────
export function SindicoLayout() {
  const { user } = useAuthStore()
  const { data: notifications } = useNotifications()
  const unread = notifications?.filter(n => !n.isRead).length ?? 0

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-sm mx-auto relative">
      {/* Conteúdo */}
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-white border-t border-gray-100 flex z-50">
        <NavLink to="/dashboard" end className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 gap-0.5 text-[10px] font-medium transition-colors ${isActive ? 'text-brand-600' : 'text-gray-400'}`
        }>
          <Home className="w-5 h-5" />
          Início
        </NavLink>
        <NavLink to="/corridas" className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 gap-0.5 text-[10px] font-medium transition-colors ${isActive ? 'text-brand-600' : 'text-gray-400'}`
        }>
          <Calendar className="w-5 h-5" />
          Corridas
        </NavLink>
        <NavLink to="/corridas/nova" className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 gap-0.5 text-[10px] font-medium transition-colors ${isActive ? 'text-brand-600' : 'text-gray-400'}`
        }>
          <div className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center -mt-5 shadow-lg">
            <Car className="w-5 h-5 text-white" />
          </div>
          <span className="mt-0.5">Agendar</span>
        </NavLink>
        <NavLink to="/rotas" className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 gap-0.5 text-[10px] font-medium transition-colors ${isActive ? 'text-brand-600' : 'text-gray-400'}`
        }>
          <Map className="w-5 h-5" />
          Rotas
        </NavLink>
        <NavLink to="/perfil" className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 gap-0.5 text-[10px] font-medium relative transition-colors ${isActive ? 'text-brand-600' : 'text-gray-400'}`
        }>
          {unread > 0 && (
            <span className="absolute top-2 right-5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
          <User className="w-5 h-5" />
          Perfil
        </NavLink>
      </nav>
    </div>
  )
}

// ── AdminLayout — sidebar desktop ──────────────────────────────────────────
const adminNavItems = [
  { to: '/admin',          label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/admin/corridas', label: 'Corridas',   icon: Car },
  { to: '/admin/sindicos', label: 'Síndicos',   icon: Users },
  { to: '/admin/rotas',    label: 'Rotas',      icon: Map },
  { to: '/admin/config',   label: 'Configurações', icon: Settings },
]

export function AdminLayout() {
  const { user } = useAuthStore()
  const logoutMutation = useLogout()

  const initials = user?.name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase() ?? 'AD'

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
        {/* Brand */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-100">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <Car className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium text-gray-900">
            Sindi<span className="text-brand-600">Ride</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {adminNavItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-800'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-800 text-xs font-medium">
              {initials}
            </div>
            <span className="text-xs text-gray-500 flex-1 truncate">{user?.name}</span>
            <button
              onClick={() => logoutMutation.mutate()}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 min-w-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
