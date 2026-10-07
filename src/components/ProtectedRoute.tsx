import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import Loading from './Loading'

export default function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loading />

  if (!session) {
    // Guardamos la ruta original para volver a ella tras entrar (PLAN §6).
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
