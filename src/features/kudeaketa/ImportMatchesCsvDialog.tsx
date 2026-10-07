import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { eu } from '../../i18n/eu'
import type { Match } from '../../types/database'
import {
  buildMatchesImportPreview,
  parseMatchesCsv,
  type MatchesImportPreview,
} from './matchesCsv'
import { insertMatches } from './api'

interface ImportMatchesCsvDialogProps {
  existing: Match[]
  onClose: () => void
  onApplied: () => void
}

// Importación del calendario de partidos con vista previa antes de aplicar.
// Columnas: Denboraldia, Aurkaria, Data.
export default function ImportMatchesCsvDialog({
  existing,
  onClose,
  onApplied,
}: ImportMatchesCsvDialogProps) {
  const [preview, setPreview] = useState<MatchesImportPreview | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)
    setFileName(file.name)
    try {
      const text = await file.text()
      setPreview(buildMatchesImportPreview(parseMatchesCsv(text), existing))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPreview(null)
    }
  }

  async function handleApply() {
    if (!preview || preview.toCreate.length === 0) return
    setApplying(true)
    setError(null)
    try {
      await insertMatches(
        preview.toCreate.map((r) => ({
          season: r.season,
          matchDate: r.matchDate,
          opponent: r.opponent,
        })),
      )
      onApplied()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setApplying(false)
    }
  }

  const applicable = preview?.toCreate.length ?? 0

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 flex flex-col gap-4 max-h-[90dvh] overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{eu.kudeaketa.importMatchesCsv}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm"
          >
            {eu.common.close}
          </button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">{eu.kudeaketa.chooseFile}</span>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={handleFile}
            className="text-sm"
          />
          <span className="text-xs text-slate-400">{eu.kudeaketa.matchesCsvHint}</span>
          {fileName && <span className="text-xs text-slate-400">{fileName}</span>}
        </label>

        {preview && (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-slate-500">{eu.kudeaketa.preview}</h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <Stat label={eu.kudeaketa.csvNew} value={preview.toCreate.length} tone="green" />
              <Stat label={eu.kudeaketa.csvExisting} value={preview.existing} tone="slate" />
              <Stat label={eu.kudeaketa.csvErrors} value={preview.errors.length} tone="red" />
            </div>

            {preview.toCreate.length > 0 && (
              <ul className="flex flex-col gap-1 text-xs max-h-40 overflow-auto rounded-lg bg-green-50 border border-green-100 p-2">
                {preview.toCreate.map((row) => (
                  <li key={`${row.season}-${row.matchDate}-${row.opponent}`} className="text-green-800">
                    {row.matchDate} · {row.opponent}{' '}
                    <span className="text-green-500">({row.season})</span>
                  </li>
                ))}
              </ul>
            )}

            {preview.errors.length > 0 && (
              <ul className="flex flex-col gap-1 text-xs max-h-40 overflow-auto rounded-lg bg-red-50 border border-red-100 p-2">
                {preview.errors.map((err) => (
                  <li key={`${err.line}-${err.raw}`} className="text-red-700">
                    <span className="font-semibold">
                      {eu.kudeaketa.line} {err.line}:
                    </span>{' '}
                    {err.reason} — <span className="text-red-400">{err.raw}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

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
            type="button"
            onClick={handleApply}
            disabled={applying || applicable === 0}
            className="rounded-lg bg-slate-900 text-white font-semibold px-4 py-2 disabled:opacity-50"
          >
            {applying ? eu.kudeaketa.applying : `${eu.kudeaketa.apply} (${applicable})`}
          </button>
        </div>
      </div>
    </div>
  )
}

const TONES: Record<string, string> = {
  green: 'bg-green-50 text-green-700 border-green-100',
  red: 'bg-red-50 text-red-700 border-red-100',
  slate: 'bg-slate-50 text-slate-700 border-slate-200',
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${TONES[tone] ?? TONES.slate}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  )
}
