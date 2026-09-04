import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ClientAuthProvider } from './context/ClientAuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tickets from './pages/Tickets'
import Reparaciones from './pages/Reparaciones'
import TicketDetail from './pages/TicketDetail'
import Inventario from './pages/Inventario'
import Clientes from './pages/Clientes'
import Tecnicos from './pages/Tecnicos'
import GruposTrabajo from './pages/GruposTrabajo'
import Notificaciones from './pages/Notificaciones'
import Reportes from './pages/Reportes'
import NotFound from './pages/NotFound'
import ClientProtectedRoute from './components/portal/ClientProtectedRoute'
import PortalLayout from './components/portal/PortalLayout'
import PortalLogin from './pages/portal/PortalLogin'
import PortalTickets from './pages/portal/PortalTickets'
import PortalTicketDetail from './pages/portal/PortalTicketDetail'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/reparaciones" element={<Reparaciones />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/tecnicos" element={<Tecnicos />} />
            <Route path="/grupos" element={<GruposTrabajo />} />
            <Route path="/notificaciones" element={<Notificaciones />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route element={<ClientAuthProvider><Outlet /></ClientAuthProvider>}>
            <Route path="/portal/login" element={<PortalLogin />} />
            <Route
              element={
                <ClientProtectedRoute>
                  <PortalLayout />
                </ClientProtectedRoute>
              }
            >
              <Route path="/portal" element={<PortalTickets />} />
              <Route path="/portal/tickets/:id" element={<PortalTicketDetail />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
