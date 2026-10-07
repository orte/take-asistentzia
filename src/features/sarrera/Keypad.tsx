import { eu } from '../../i18n/eu'

interface KeypadProps {
  onDigit: (digit: string) => void
  onDelete: () => void
  onSubmit: () => void
  disabled?: boolean
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

// Teclado numérico propio, botones grandes. No usa <input>, así que no abre el
// teclado nativo del móvil (PLAN §7.1).
export default function Keypad({ onDigit, onDelete, onSubmit, disabled }: KeypadProps) {
  const keyClass =
    'h-16 rounded-xl bg-white border border-slate-300 text-2xl font-semibold ' +
    'text-slate-900 active:bg-slate-100 disabled:opacity-40 select-none'

  return (
    <div className="grid grid-cols-3 gap-2">
      {DIGITS.map((d) => (
        <button
          key={d}
          type="button"
          disabled={disabled}
          onClick={() => onDigit(d)}
          className={keyClass}
          aria-label={d}
        >
          {d}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        className={keyClass}
        aria-label={eu.common.delete}
      >
        ⌫
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDigit('0')}
        className={keyClass}
        aria-label="0"
      >
        0
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        className="h-16 rounded-xl bg-brand text-white text-2xl font-bold active:bg-brand-dark disabled:opacity-40 select-none"
        aria-label={eu.sarrera.ok}
      >
        {eu.sarrera.ok}
      </button>
    </div>
  )
}
