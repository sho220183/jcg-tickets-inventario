import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Ticket,
  Wrench,
  Users,
  Package,
  UserCog,
  Users2,
  Bell,
  BarChart3,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/cn'

const navItems = [
  { to: '/', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/tickets', label: 'Tickets', icon: Ticket },
  { to: '/reparaciones', label: 'Reparaciones', icon: Wrench },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/inventario', label: 'Inventario', icon: Package },
  { to: '/tecnicos', label: 'Técnicos', icon: UserCog, adminOnly: true },
  { to: '/grupos', label: 'Grupos de trabajo', icon: Users2, adminOnly: true },
  { to: '/notificaciones', label: 'Notificaciones', icon: Bell, adminOnly: true },
  { to: '/reportes', label: 'Reportes', icon: BarChart3, adminOnly: true },
]

function iniciales(nombre) {
  if (!nombre) return '?'
  const partes = nombre.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase()
}

function SidebarContent({ items, isAdmin, profile, signOut, onNavigate }) {
  return (
    <>
      <div>
        <div className="flex items-center gap-2 px-5 py-6">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-sm font-bold text-navy-900">
            J
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight tracking-tight">JCG Infotech</p>
            <p className="text-xs text-navy-300">Tickets &amp; Inventario</p>
          </div>
        </div>
        <nav className="mt-2 flex flex-col gap-1 px-3">
          {items
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-cyan-500 text-navy-900 shadow-sm'
                      : 'text-navy-100 hover:bg-navy-700/70'
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            ))}
        </nav>
      </div>

      <div className="border-t border-navy-700 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-600 text-xs font-semibold text-navy-50 ring-1 ring-navy-500">
            {iniciales(profile?.nombre_completo)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{profile?.nombre_completo}</p>
            <p className="text-xs capitalize text-navy-300">{profile?.rol}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-200"
        >
          <LogOut className="h-3.5 w-3.5" />
          Cerrar sesión
        </button>
      </div>
    </>
  )
}

export default function Layout() {
  const { profile, isAdmin, signOut } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar fija — escritorio */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-navy-800 text-navy-50 md:flex">
        <SidebarContent
          items={navItems}
          isAdmin={isAdmin}
          profile={profile}
          signOut={signOut}
        />
      </aside>

      {/* Barra superior + drawer — mobile */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-800 text-xs font-bold text-cyan-400">
              J
            </div>
            <span className="text-sm font-semibold text-navy-800">JCG Infotech</span>
          </div>
          <button
            onClick={() => setMenuAbierto(true)}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {menuAbierto && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-slate-900/50"
              onClick={() => setMenuAbierto(false)}
            />
            <aside className="absolute inset-y-0 left-0 flex w-72 flex-col justify-between bg-navy-800 text-navy-50 shadow-xl">
              <button
                onClick={() => setMenuAbierto(false)}
                className="absolute right-3 top-4 rounded-md p-1.5 text-navy-200 hover:bg-navy-700"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent
                items={navItems}
                isAdmin={isAdmin}
                profile={profile}
                signOut={signOut}
                onNavigate={() => setMenuAbierto(false)}
              />
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
