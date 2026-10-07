import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { eu } from '../../i18n/eu'
import { formatClock, formatDate } from '../../lib/datetime'
import { downloadCsv, safeFilename, toCsv } from '../../lib/csvExport'
import { parseMemberNumber } from '../../lib/memberNumber'
import type { Match } from '../../types/database'
import {
  addAttendance,
  fetchMatch,
  fetchMatchAttendances,
  removeAttendance,
  type AttendanceDetail,
} from '../../features/kudeaketa/api'

export default function PartidaXehetasuna() {
  const { id } = useParams()
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [match, setMatch] = useState<Match | null>(null)
  const [attendances, setAttendances] = useState<AttendanceDetail[]>([])
  const [addNumber, setAddNumber] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  async function loadAttendances(matchId: string) {
    setAttendances(await fetchMatchAttendances(matchId))
  }

  useEffect(() => {
    if (!id) return
    let active = true
    void (async () => {
      try {
        const [m, a] = await Promise.all([fetchMatch(id), fetchMatchAttendances(id)])
        if (!active) return
        setMatch(m)
        setAttendances(a)
        setPhase(m ? 'ready' : 'error')
      } catch {
        if (active) setPhase('error')
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!id) return
    setAddError(null)
    const number = parseMemberNumber(addNumber)
    if (number === null) {
      setAddError(eu.sarrera.unknownNumber)
      return
    }
    const result = await addAttendance(id, number)
    if (!result.ok) {
      setAddError(
        result.reason === 'duplicate'
          ? eu.sarrera.alreadyRegistered
          : result.reason === 'unknown'
            ? eu.sarrera.unknownNumber
            : eu.common.error,
      )
      return
    }
    setAddNumber('')
    await loadAttendances(id)
  }

  async function handleRemove(attendanceId: string) {
    await removeAttendance(attendanceId)
    setAttendances((prev) => prev.filter((a) => a.id !== attendanceId))
  }

  function exportAttendances() {
    if (!match) return
    const headers = [
      eu.sailkapena.memberNumber,
      eu.sailkapena.name,
      eu.kudeaketa.time,
      eu.kudeaketa.device,
    ]
    const data = attendances.map((a) => [
      a.memberNumber,
      a.memberName ?? '',
      formatClock(a.registeredAt),
      a.deviceLabel ?? '',
    ])
    const filename = `${safeFilename(match.opponent)}-${match.match_date}.csv`
    downloadCsv(filename, toCsv(headers, data))
  }

  if (phase === 'loading') return <p className="text-slate-500">{eu.common.loading}</p>
  if (phase === 'error' || !match) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-red-600">{eu.common.error}</p>
        <Link to="/kudeaketa/partidak" className="text-slate-600 underline">
          {eu.kudeaketa.backToMatches}
        </Link>
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <Link to="/kudeaketa/partidak" className="text-sm text-slate-500 hover:text-slate-900">
        {eu.kudeaketa.backToMatches}
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{match.opponent}</h1>
        <p className="text-slate-500">
          {formatDate(match.match_date)} · {eu.kudeaketa.season} {match.season}
        </p>
      </div>

      {/* Añadir un socio a mano */}
      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">{eu.kudeaketa.addAttendee}</span>
          <input
            inputMode="numeric"
            value={addNumber}
            onChange={(e) => setAddNumber(e.target.value)}
            placeholder={eu.kudeaketa.memberNumber}
            className="w-40 rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 text-white font-semibold px-4 py-2"
        >
          {eu.kudeaketa.add}
        </button>
      </form>
      {addError && (
        <p className="text-sm text-red-600" role="alert">
          {addError}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-500">
          {eu.kudeaketa.attendeeList} ({attendances.length})
        </h2>
        {attendances.length > 0 && (
          <button
            type="button"
            onClick={exportAttendances}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            {eu.kudeaketa.exportCsv}
          </button>
        )}
      </div>
      {attendances.length === 0 ? (
        <p className="text-slate-400">{eu.kudeaketa.noAttendees}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {attendances.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-3 py-2">
              <span className="w-14 shrink-0 text-sm text-slate-400">#{a.memberNumber}</span>
              <span className="flex-1 min-w-0 truncate">{a.memberName ?? '—'}</span>
              <span className="shrink-0 text-sm text-slate-500">{formatClock(a.registeredAt)}</span>
              {a.deviceLabel && (
                <span className="shrink-0 text-xs text-slate-400">{a.deviceLabel}</span>
              )}
              <button
                type="button"
                onClick={() => void handleRemove(a.id)}
                className="shrink-0 text-sm text-slate-400 hover:text-red-600"
              >
                {eu.kudeaketa.remove}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
