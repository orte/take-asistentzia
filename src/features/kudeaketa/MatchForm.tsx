import { useState } from 'react'
import type { FormEvent } from 'react'
import { eu } from '../../i18n/eu'
import { madridDateString } from '../../lib/datetime'
import { seasonForDate } from '../../lib/season'
import type { Match } from '../../types/database'

interface MatchFormProps {
  initial: Match | null
  title: string
  onSubmit: (input: { season: string; matchDate: string; opponent: string }) => Promise<void>
  onClose: () => void
}

// Alta/edición de partido (PLAN §7.4). La temporada se propone a partir de la
// fecha (corte 1 de julio) mientras no se edite a mano.
export default function MatchForm({ initial, title, onSubmit, onClose }: MatchFormProps) {
  const defaultDate = initial?.match_date ?? madridDateString(new Date())
  const [matchDate, setMatchDate] = useState(defaultDate)
  const [opponent, setOpponent] = useState(initial?.opponent ?? '')
  const [season, setSeason] = useState(initial?.season ?? seasonForDate(defaultDate))
  const [seasonTouched, setSeasonTouched] = useState(initial !== null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleDateChange(value: string) {
    setMatchDate(value)
    if (!seasonTouched && value) {
      try {
        setSeason(seasonForDate(value))
      } catch {
        // fecha incompleta mientras se teclea: no tocamos la temporada
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedOpponent = opponent.trim()
    const trimmedSeason = season.trim()
    if (!matchDate || trimmedOpponent.length === 0 || trimmedSeason.length === 0) {
      setError(eu.common.error)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ season: trimmedSeason, matchDate, opponent: trimmedOpponent })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-2xl p-6 flex flex-col gap-4"
      >
        <h2 className="text-xl font-bold">{title}</h2>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">{eu.kudeaketa.date}</span>
          <input
            type="date"
            value={matchDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">{eu.kudeaketa.opponent}</span>
          <input
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">{eu.kudeaketa.season}</span>
          <input
            value={season}
            onChange={(e) => {
              setSeasonTouched(true)
              setSeason(e.target.value)
            }}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 font-medium"
          >
            {eu.common.cancel}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 text-white font-semibold px-4 py-2 disabled:opacity-50"
          >
            {eu.common.save}
          </button>
        </div>
      </form>
    </div>
  )
}
