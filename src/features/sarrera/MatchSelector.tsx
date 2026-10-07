import { useState } from 'react'
import type { FormEvent } from 'react'
import { eu } from '../../i18n/eu'
import { formatDate } from '../../lib/datetime'
import type { Match } from '../../types/database'

interface MatchSelectorProps {
  matches: Match[]
  today: string
  creating: boolean
  error: string | null
  onSelect: (match: Match) => void
  onCreate: (opponent: string) => void
  /** null cuando no hay partido activo (no se puede cerrar sin elegir). */
  onClose: (() => void) | null
}

// Selección de partido (PLAN §7.1): crear el de hoy pidiendo rival, o elegir
// otro de la lista.
export default function MatchSelector({
  matches,
  today,
  creating,
  error,
  onSelect,
  onCreate,
  onClose,
}: MatchSelectorProps) {
  const [opponent, setOpponent] = useState('')
  const hasToday = matches.some((m) => m.match_date === today)

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = opponent.trim()
    if (value.length === 0) return
    onCreate(value)
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 flex flex-col gap-5 max-h-[90dvh] overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{eu.sarrera.selectMatch}</h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-sm"
            >
              {eu.common.close}
            </button>
          )}
        </div>

        {!hasToday && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            {eu.sarrera.noMatchToday}
          </div>
        )}

        <form onSubmit={handleCreate} className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="opponent">
            {eu.sarrera.createMatch} · {formatDate(today)}
          </label>
          <div className="flex gap-2">
            <input
              id="opponent"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder={eu.sarrera.opponent}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
            />
            <button
              type="submit"
              disabled={creating || opponent.trim().length === 0}
              className="rounded-lg bg-brand text-white font-semibold px-4 disabled:opacity-50"
            >
              {eu.common.save}
            </button>
          </div>
        </form>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-slate-500">
            {eu.sarrera.otherMatches}
          </h3>
          {matches.length === 0 ? (
            <p className="text-sm text-slate-400">—</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {matches.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(m)}
                    className="w-full text-left rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                  >
                    <span className="font-medium">{m.opponent}</span>
                    <span className="text-slate-500"> · {formatDate(m.match_date)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
