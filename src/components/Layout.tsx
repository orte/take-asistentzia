import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { eu } from '../i18n/eu'

const links = [
  { to: '/sarrera', label: eu.nav.sarrera },
  { to: '/sailkapena', label: eu.nav.sailkapena },
  { to: '/kudeaketa/partidak', label: eu.nav.partidak },
  { to: '/kudeaketa/bazkideak', label: eu.nav.bazkideak },
]

export default function Layout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 text-slate-900">
      <header className="bg-brand-dark text-white">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <NavLink to="/sarrera" className="flex items-center gap-2">
            <img
              src="/take-logo.png"
              alt=""
              className="h-9 w-9 rounded-full bg-white object-contain p-0.5"
            />
            <span className="font-bold tracking-wide">TAKE</span>
          </NavLink>
          <nav className="flex items-center gap-1 text-sm">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md font-medium ${
                    isActive
                      ? 'bg-brand text-white'
                      : 'text-white/70 hover:bg-white/10'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2 rounded-md font-medium text-white/70 hover:bg-white/10"
            >
              {eu.nav.logout}
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
