import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { eu } from '../i18n/eu'

/** Extrae con seguridad la ruta de origen guardada por ProtectedRoute. */
function fromPath(state: unknown): string {
  if (state && typeof state === 'object' && 'from' in state) {
    const from = (state as { from?: unknown }).from
    if (from && typeof from === 'object' && 'pathname' in from) {
      const pathname = (from as { pathname?: unknown }).pathname
      if (typeof pathname === 'string') return pathname
    }
  }
  return '/sarrera'
}

export default function Login() {
  const { session, signIn } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const target = fromPath(location.state)

  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Si ya hay sesión, no mostramos el login.
  if (session) return <Navigate to={target} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await signIn(password)
    setSubmitting(false)
    if (result.error) {
      // No filtramos el motivo real: siempre el mismo mensaje.
      setError(eu.auth.wrongPassword)
      setPassword('')
      return
    }
    navigate(target, { replace: true })
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4"
      >
        <h1 className="text-xl font-bold text-slate-900">{eu.appName}</h1>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">
            {eu.auth.password}
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
            className="rounded-lg border border-slate-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </label>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || password.length === 0}
          className="rounded-lg bg-slate-900 text-white font-semibold py-2.5 disabled:opacity-50"
        >
          {submitting ? eu.auth.loggingIn : eu.auth.login}
        </button>
      </form>
    </main>
  )
}
