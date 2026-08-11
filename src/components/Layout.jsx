import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/tickets', label: 'Tickets' },
  { to: '/reparaciones', label: 'Reparaciones' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/inventario', label: 'Inventario' },
  { to: '/tecnicos', label: 'Técnicos', adminOnly: true },
  { to: '/grupos', label: 'Grupos de trabajo', adminOnly: true },
  { to: '/notificaciones', label: 'Notificaciones', adminOnly: true },
]

export default function Layout() {
  const { profile, isAdmin, signOut } = useAuth()
  const items = navItems.filter((item) => !item.adminOnly || isAdmin)

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="flex w-60 flex-col justify-between bg-navy-800 text-navy-50">
        <div>
          <div className="px-5 py-6">
            <p className="text-lg font-semibold tracking-tight">JCG Infotech</p>
            <p className="text-xs text-navy-300">Tickets & Inventario</p>
          </div>
          <nav className="mt-2 flex flex-col gap-1 px-3">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-cyan-500 text-navy-900'
                      : 'text-navy-100 hover:bg-navy-700'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="border-t border-navy-700 px-4 py-4">
          <p className="truncate text-sm font-medium">{profile?.nombre_completo}</p>
          <p className="text-xs capitalize text-navy-300">{profile?.rol}</p>
          <button
            onClick={signOut}
            className="mt-3 text-xs font-medium text-cyan-300 hover:text-cyan-200"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
