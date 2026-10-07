import { eu } from '../../i18n/eu'
import { formatClock } from '../../lib/datetime'
import type { RegistrationStatus } from './registration'

export interface Feedback {
  status: RegistrationStatus
  memberNumber: number
  name: string | null
  previousAt: string | null
  /** Cambia en cada registro para reiniciar el temporizador de auto-cierre. */
  nonce: number
}

interface FeedbackOverlayProps {
  feedback: Feedback
  onClose: () => void
}

const STYLES: Record<RegistrationStatus, { bg: string; icon: string }> = {
  registered: { bg: 'bg-green-600', icon: '✓' },
  duplicate: { bg: 'bg-amber-500', icon: '!' },
  unknown: { bg: 'bg-red-600', icon: '✕' },
  inactive: { bg: 'bg-red-600', icon: '✕' },
}

// Respuesta a pantalla casi completa: color + icono + texto, nunca solo color
// (PLAN §7.1). No bloquea: un toque o teclear otro número la cierra.
export default function FeedbackOverlay({ feedback, onClose }: FeedbackOverlayProps) {
  const { bg, icon } = STYLES[feedback.status]

  return (
    <button
      type="button"
      onClick={onClose}
      aria-live="assertive"
      className={`fixed inset-0 z-50 ${bg} text-white flex flex-col items-center justify-center gap-4 px-6 text-center`}
    >
      <span className="text-7xl font-black" aria-hidden="true">
        {icon}
      </span>
      <Message feedback={feedback} />
    </button>
  )
}

function Message({ feedback }: { feedback: Feedback }) {
  const number = <span className="opacity-90">#{feedback.memberNumber}</span>

  switch (feedback.status) {
    case 'registered':
      return (
        <div className="flex flex-col gap-1">
          <span className="text-4xl font-bold">{eu.sarrera.registered}</span>
          <span className="text-2xl">{feedback.name}</span>
          <span className="text-xl">{number}</span>
        </div>
      )
    case 'duplicate':
      return (
        <div className="flex flex-col gap-1">
          <span className="text-3xl font-bold">{eu.sarrera.alreadyRegistered}</span>
          <span className="text-2xl">{feedback.name}</span>
          {feedback.previousAt && (
            <span className="text-xl">
              {eu.sarrera.previousRegistration}: {formatClock(feedback.previousAt)}
            </span>
          )}
        </div>
      )
    case 'unknown':
      return (
        <div className="flex flex-col gap-1">
          <span className="text-3xl font-bold">{eu.sarrera.unknownNumber}</span>
          <span className="text-2xl">{number}</span>
        </div>
      )
    case 'inactive':
      return (
        <div className="flex flex-col gap-1">
          <span className="text-3xl font-bold">{eu.sarrera.inactiveMember}</span>
          <span className="text-2xl">{feedback.name}</span>
          <span className="text-xl">{number}</span>
        </div>
      )
  }
}
