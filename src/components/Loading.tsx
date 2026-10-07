import { eu } from '../i18n/eu'

export default function Loading() {
  return (
    <div
      className="min-h-dvh flex items-center justify-center bg-slate-50 text-slate-500"
      role="status"
      aria-live="polite"
    >
      {eu.common.loading}
    </div>
  )
}
