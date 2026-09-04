import { Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useClientAuth } from '../../context/ClientAuthContext'

export default function PortalLayout() {
  const { cliente, signOut } = useClientAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-800 text-sm font-bold text-cyan-400">
              J
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-navy-800">JCG Infotech</p>
              <p className="text-xs text-slate-400">Portal de clientes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">{cliente?.nombre}</span>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
        <Outlet />
      </main>
    </div>
  )
}
