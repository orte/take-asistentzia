import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { eu } from '../../i18n/eu'
import { formatDate } from '../../lib/datetime'
import { downloadCsv, safeFilename, toCsv } from '../../lib/csvExport'
import { fetchRanking } from '../../lib/ranking'
import type { Match } from '../../types/database'
import {
  createMatch,
  deleteMatch,
  fetchMatchesWithCounts,
  updateMatch,
  type MatchWithCount,
} from '../../features/kudeaketa/api'
import MatchForm from '../../features/kudeaketa/MatchForm'
import ImportMatchesCsvDialog from '../../features/kudeaketa/ImportMatchesCsvDialog'

type Editing = { mode: 'new' } | { mode: 'edit'; match: Match } | null

export default function Partidak() {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [matches, setMatches] = useState<MatchWithCount[]>([])
  const [editing, setEditing] = useState<Editing>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  async function load() {
    try {
      setMatches(await fetchMatchesWithCounts())
      setPhase('ready')
    } catch {
      setPhase('error')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  // Agrupadas por temporada (descendente), conservando el orden por fecha.
  const bySeason = useMemo(() => {
    const groups = new Map<string, MatchWithCount[]>()
    for (const m of matches) {
      const list = groups.get(m.season) ?? []
      list.push(m)
      groups.set(m.season, list)
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [matches])

  async function handleDelete(id: string) {
    await deleteMatch(id)
    setConfirmDelete(null)
    setMatches((prev) => prev.filter((m) => m.id !== id))
  }

  async function exportRanking(season: string) {
    const rows = await fetchRanking(season)
    const headers = [
      eu.sailkapena.position,
      eu.sailkapena.memberNumber,
      eu.sailkapena.name,
      eu.sailkapena.attended,
      eu.sailkapena.total,
    ]
    const data = rows.map((r) => [
      r.position,
      r.member_number,
      r.name,
      r.attended,
      r.total_matches,
    ])
    downloadCsv(`sailkapena-${safeFilename(season)}.csv`, toCsv(headers, data))
  }

  if (phase === 'loading') return <p className="text-slate-500">{eu.common.loading}</p>
  if (phase === 'error') return <p className="text-red-600">{eu.common.error}</p>

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{eu.kudeaketa.matches}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setImporting(true)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            {eu.kudeaketa.importCsv}
          </button>
          <button
            type="button"
            onClick={() => setEditing({ mode: 'new' })}
            className="rounded-lg bg-slate-900 text-white font-semibold px-4 py-2 text-sm"
          >
            {eu.kudeaketa.newMatch}
          </button>
        </div>
      </div>

      {matches.length === 0 ? (
        <p className="text-slate-400">{eu.kudeaketa.noMatches}</p>
      ) : (
        bySeason.map(([season, list]) => (
          <div key={season} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-500">
                {eu.kudeaketa.season} {season}
              </h2>
              <button
                type="button"
                onClick={() => void exportRanking(season)}
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                {eu.kudeaketa.exportCsv}
              </button>
            </div>
            <ul className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {list.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-3 py-2">
                  <Link to={`/kudeaketa/partidak/${m.id}`} className="flex-1 min-w-0">
                    <span className="font-medium">{m.opponent}</span>
                    <span className="text-slate-500"> · {formatDate(m.match_date)}</span>
                  </Link>
                  <span className="shrink-0 text-sm text-slate-500">
                    {eu.kudeaketa.attendees}: {m.attendeeCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditing({ mode: 'edit', match: m })}
                    className="shrink-0 text-sm text-slate-500 hover:text-slate-900"
                  >
                    {eu.kudeaketa.edit}
                  </button>
                  {confirmDelete === m.id ? (
                    <span className="shrink-0 flex items-center gap-2 text-sm">
                      <button
                        type="button"
                        onClick={() => void handleDelete(m.id)}
                        className="font-semibold text-red-600"
                      >
                        {eu.common.yes}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="text-slate-500"
                      >
                        {eu.common.no}
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(m.id)}
                      className="shrink-0 text-sm text-slate-400 hover:text-red-600"
                      title={eu.kudeaketa.deleteMatchConfirm}
                    >
                      {eu.common.delete}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      {editing && (
        <MatchForm
          initial={editing.mode === 'edit' ? editing.match : null}
          title={editing.mode === 'edit' ? eu.kudeaketa.editMatch : eu.kudeaketa.newMatch}
          onClose={() => setEditing(null)}
          onSubmit={async (input) => {
            if (editing.mode === 'edit') {
              await updateMatch(editing.match.id, input)
            } else {
              await createMatch(input)
            }
            await load()
          }}
        />
      )}

      {importing && (
        <ImportMatchesCsvDialog
          existing={matches}
          onClose={() => setImporting(false)}
          onApplied={() => void load()}
        />
      )}
    </section>
  )
}
