import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Sailkapena from './pages/Sailkapena'
import Sarrera from './pages/Sarrera'
import Bazkideak from './pages/kudeaketa/Bazkideak'
import Partidak from './pages/kudeaketa/Partidak'
import PartidaXehetasuna from './pages/kudeaketa/PartidaXehetasuna'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Públicas */}
          <Route path="/" element={<Sailkapena />} />
          <Route path="/login" element={<Login />} />

          {/* Protegidas: sesión + layout con navegación */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/sarrera" element={<Sarrera />} />
              <Route path="/kudeaketa/bazkideak" element={<Bazkideak />} />
              <Route path="/kudeaketa/partidak" element={<Partidak />} />
              <Route path="/kudeaketa/partidak/:id" element={<PartidaXehetasuna />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
