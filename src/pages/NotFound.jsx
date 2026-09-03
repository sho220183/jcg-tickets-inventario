import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import Button from '../components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-navy-400 shadow-sm ring-1 ring-slate-200">
        <Compass className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">Error 404</p>
      <h1 className="mt-1 text-2xl font-semibold text-navy-800">Esta página no existe</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Puede que el enlace esté roto o que la página se haya movido.
      </p>
      <Button as={Link} to="/" className="mt-6">
        Volver al Dashboard
      </Button>
    </div>
  )
}
