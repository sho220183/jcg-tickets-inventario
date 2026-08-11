import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
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
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
