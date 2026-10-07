import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { eu } from '../i18n/eu'
import { madridDateString } from '../lib/datetime'
import { fetchRanking, fetchSeasons } from '../lib/ranking'
import { seasonForDate } from '../lib/season'
import { normalizeText } from '../lib/text'
import type { RankingRow } from '../types/database'

// Ranking público (PLAN §7.2). Vista limpia, sin enlaces a zonas protegidas
// más allá del acceso discreto al login del pie.
export default function Sailkapena() {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [seasons, setSeasons] = useState<string[]>([])
  const [season, setSeason] = useState<string | null>(null)
  const [ranking, setRanking] = useState<RankingRow[]>([])
  const [rankingLoading, setRankingLoading] = useState(false)
  const [query, setQuery] = useState('')

  // Temporadas disponibles + temporada por defecto (la actual si existe).
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const list = await fetchSeasons()
        if (!active) return
        setSeasons(list)
        const current = seasonForDate(madridDateString(new Date()))
        setSeason(list.includes(current) ? current : (list[0] ?? null))
        setPhase('ready')
      } catch {
        if (active) setPhase('error')
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // Ranking de la temporada seleccionada.
  useEffect(() => {
    if (!season) {
      setRanking([])
      return
    }
    let active = true
    setRankingLoading(true)
    void (async () => {
      try {
        const rows = await fetchRanking(season)
        if (active) setRanking(rows)
      } catch {
        if (active) setRanking([])
      } finally {
        if (active) setRankingLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [season])

  const filtered = useMemo(() => {
    const q = normalizeText(query)
    if (q.length === 0) return ranking
    return ranking.filter(
      (r) =>
        normalizeText(r.name).includes(q) || String(r.member_number).includes(query.trim()),
    )
  }, [ranking, query])

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 text-slate-900">
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8 flex flex-col gap-5">
        <header className="flex flex-col gap-1">
          <p className="text-sm text-slate-400">{eu.appName}</p>
          <h1 className="text-3xl font-bold">{eu.sailkapena.title}</h1>
        </header>

        {phase === 'loading' && <p className="text-slate-500">{eu.common.loading}</p>}
        {phase === 'error' && <p className="text-red-600">{eu.common.error}</p>}

        {phase === 'ready' && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {seasons.length > 0 && season && (
                <label className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-slate-600">{eu.sailkapena.season}</span>
                  <select
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  >
                    {seasons.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={eu.sailkapena.searchPlaceholder}
                className="flex-1 min-w-48 rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>

            {rankingLoading ? (
              <p className="text-slate-500">{eu.common.loading}</p>
            ) : filtered.length === 0 ? (
              <p className="text-slate-400">{eu.sailkapena.empty}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left">
                  <thead className="text-sm text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 w-16">{eu.sailkapena.position}</th>
                      <th className="px-3 py-2 w-20">#</th>
                      <th className="px-3 py-2">{eu.sailkapena.name}</th>
                      <th className="px-3 py-2 text-right w-24">{eu.sailkapena.attended}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((row) => (
                      <tr key={row.member_number} className="text-lg">
                        <td className="px-3 py-2 font-bold tabular-nums">{row.position}</td>
                        <td className="px-3 py-2 text-slate-400 tabular-nums">{row.member_number}</td>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.attended} / {row.total_matches}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="py-4 text-center">
        <Link to="/login" className="text-xs text-slate-400 hover:text-slate-600">
          ·
        </Link>
      </footer>
    </div>
  )
}
