import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import {
  Car, Home, Calendar, Map, User,
  LayoutDashboard, Users, Settings,
  LogOut, Zap, Menu, X,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useLogout, useNotifications, useMotoristaActiveRide } from '@/hooks'

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

// ── SindicoLayout ──────────────────────────────────────────────────────────
const sindicoNav = [
  { to: '/dashboard',     label: 'Início',   icon: Home,     end: true  },
  { to: '/corridas',      label: 'Corridas', icon: Calendar, end: false },
  { to: '/corridas/nova', label: 'Agendar',  icon: Car,      end: false, fab: true },
  { to: '/rotas',         label: 'Rotas',    icon: Map,      end: false },
  { to: '/perfil',        label: 'Perfil',   icon: User,     end: false },
]

export function SindicoLayout() {
  const { data: notifications } = useNotifications()
  const unread = notifications?.filter(n => !n.isRead).length ?? 0
  const { user } = useAuthStore()
  const logout = useLogout()

  const initials = user?.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() ?? 'SI'

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sidebar — visível apenas em desktop (md+) ─────────────────── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 bg-white border-r border-gray-100 z-40">
        <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-100">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <Car className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium text-gray-900">
            Sindi<span className="text-brand-600">Ride</span>
          </span>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {sindicoNav.map(({ to, label, icon: Icon, end }) => (
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
              {label === 'Perfil' && unread > 0 && (
                <span className="ml-auto w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-medium flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-800 text-xs font-medium flex-shrink-0">
              {initials}
            </div>
            <span className="text-xs text-gray-500 flex-1 min-w-0 truncate">{user?.name}</span>
            <button
              onClick={() => logout.mutate()}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Conteúdo principal ─────────────────────────────────────────── */}
      <main className="md:ml-56 pb-20 md:pb-8 min-h-screen">
        <div className="max-w-3xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* ── Bottom nav — visível apenas em mobile (< md) ──────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-50">
        {sindicoNav.map(({ to, label, icon: Icon, end, fab }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-3 gap-0.5 text-[10px] font-medium transition-colors relative ${
                isActive ? 'text-brand-600' : 'text-gray-400'
              }`
            }
          >
            {fab ? (
              <div className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center -mt-5 shadow-lg">
                <Car className="w-5 h-5 text-white" />
              </div>
            ) : (
              <Icon className="w-5 h-5" />
            )}
            {label === 'Perfil' && unread > 0 && (
              <span className="absolute top-2 right-3 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
            <span className={fab ? 'mt-0.5' : ''}>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

// ── AdminLayout ────────────────────────────────────────────────────────────
const adminNavItems = [
  { to: '/admin',            label: 'Dashboard',     icon: LayoutDashboard, end: true },
  { to: '/admin/corridas',   label: 'Corridas',      icon: Car },
  { to: '/admin/sindicos',   label: 'Síndicos',      icon: Users },
  { to: '/admin/motoristas', label: 'Motoristas',    icon: Car },
  { to: '/admin/rotas',      label: 'Rotas',         icon: Map },
  { to: '/admin/config',     label: 'Configurações', icon: Settings },
]

export function AdminLayout() {
  const { user } = useAuthStore()
  const logoutMutation = useLogout()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const initials = user?.name
    .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() ?? 'AD'

  const NavItems = ({ onNav }: { onNav?: () => void }) => (
    <>
      <nav className="flex-1 p-3 flex flex-col gap-0.5">
        {adminNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNav}
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

      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-800 text-xs font-medium flex-shrink-0">
            {initials}
          </div>
          <span className="text-xs text-gray-500 flex-1 min-w-0 truncate">{user?.name}</span>
          <button
            onClick={() => logoutMutation.mutate()}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  )

  const Brand = () => (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
        <Car className="w-4 h-4 text-white" />
      </div>
      <span className="font-medium text-gray-900">
        Sindi<span className="text-brand-600">Ride</span>
      </span>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Top bar mobile ─────────────────────────────────────────────── */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 z-40">
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-900"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Brand />
        <div className="w-9" />
      </header>

      {/* ── Sidebar desktop (md+) ──────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-52 bg-white border-r border-gray-100 z-40">
        <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-100">
          <Brand />
        </div>
        <NavItems />
      </aside>

      {/* ── Drawer mobile ──────────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-50"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-0 h-full w-64 bg-white flex flex-col z-50 shadow-xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <Brand />
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavItems onNav={() => setDrawerOpen(false)} />
          </aside>
        </>
      )}

      {/* ── Conteúdo ───────────────────────────────────────────────────── */}
      <main className="md:ml-52 pt-14 md:pt-0 min-h-screen overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

// ── MotoristaLayout ────────────────────────────────────────────────────────
const motoristaNav = [
  { to: '/motorista',           label: 'Início',   icon: Home,    end: true  },
  { to: '/motorista/corridas',  label: 'Corridas', icon: Car,     end: false },
  { to: '/motorista/ativa',     label: 'Ativa',    icon: Zap,     end: false, activeIndicator: true },
  { to: '/motorista/perfil',    label: 'Perfil',   icon: User,    end: false },
]

export function MotoristaLayout() {
  const { data: activeRide } = useMotoristaActiveRide()
  const { user } = useAuthStore()
  const logout = useLogout()
  const hasActive = !!activeRide

  const initials = user?.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() ?? 'MO'

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sidebar — visível apenas em desktop (md+) ─────────────────── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 bg-white border-r border-gray-100 z-40">
        <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-100">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <Car className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium text-gray-900">
            Sindi<span className="text-brand-600">Ride</span>
          </span>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {motoristaNav.map(({ to, label, icon: Icon, end, activeIndicator }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                  isActive
                    ? 'bg-brand-50 text-brand-800'
                    : activeIndicator && hasActive
                      ? 'text-amber-600 hover:bg-amber-50'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
              {activeIndicator && hasActive && (
                <span className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-800 text-xs font-medium flex-shrink-0">
              {initials}
            </div>
            <span className="text-xs text-gray-500 flex-1 min-w-0 truncate">{user?.name}</span>
            <button
              onClick={() => logout.mutate()}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Conteúdo principal ─────────────────────────────────────────── */}
      <main className="md:ml-56 pb-20 md:pb-8 min-h-screen">
        <div className="max-w-3xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* ── Bottom nav — visível apenas em mobile (< md) ──────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-50">
        {motoristaNav.map(({ to, label, icon: Icon, end, activeIndicator }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-3 gap-0.5 text-[10px] font-medium transition-colors relative ${
                isActive ? 'text-brand-600' : activeIndicator && hasActive ? 'text-amber-500' : 'text-gray-400'
              }`
            }
          >
            {activeIndicator && hasActive && (
              <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            )}
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
