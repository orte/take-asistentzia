import { Link } from 'react-router-dom'
import { eu } from '../i18n/eu'

export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-slate-50 text-slate-900 px-4 text-center">
      <h1 className="text-2xl font-bold">{eu.notFound.title}</h1>
      <Link to="/" className="text-slate-600 underline hover:text-slate-900">
        {eu.notFound.back}
      </Link>
    </main>
  )
}
