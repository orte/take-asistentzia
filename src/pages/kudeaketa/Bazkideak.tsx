import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { eu } from '../../i18n/eu'
import { normalizeText } from '../../lib/text'
import { parseMemberNumber } from '../../lib/memberNumber'
import type { Member } from '../../types/database'
import {
  fetchMembers,
  insertMember,
  setMemberActive,
  updateMemberName,
} from '../../features/kudeaketa/api'
import ImportCsvDialog from '../../features/kudeaketa/ImportCsvDialog'

export default function Bazkideak() {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [members, setMembers] = useState<Member[]>([])
  const [query, setQuery] = useState('')
  const [importing, setImporting] = useState(false)

  const [newNumber, setNewNumber] = useState('')
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  const [editingNumber, setEditingNumber] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  async function load() {
    setPhase('loading')
    try {
      setMembers(await fetchMembers())
      setPhase('ready')
    } catch {
      setPhase('error')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const q = normalizeText(query)
    if (q.length === 0) return members
    return members.filter(
      (m) => normalizeText(m.name).includes(q) || String(m.number).includes(query.trim()),
    )
  }, [members, query])

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAddError(null)
    const number = parseMemberNumber(newNumber)
    const name = newName.trim()
    if (number === null || name.length === 0) {
      setAddError(eu.common.error)
      return
    }
    const result = await insertMember({ number, name })
    if (!result.ok) {
      setAddError(result.reason === 'duplicate' ? eu.kudeaketa.duplicateNumber : eu.common.error)
      return
    }
    setMembers((prev) =>
      [...prev, result.member].sort((a, b) => a.number - b.number),
    )
    setNewNumber('')
    setNewName('')
  }

  function startEdit(member: Member) {
    setEditingNumber(member.number)
    setEditName(member.name)
  }

  async function saveEdit(number: number) {
    const name = editName.trim()
    if (name.length === 0) return
    await updateMemberName(number, name)
    setMembers((prev) => prev.map((m) => (m.number === number ? { ...m, name } : m)))
    setEditingNumber(null)
  }

  async function toggleActive(member: Member) {
    await setMemberActive(member.number, !member.active)
    setMembers((prev) =>
      prev.map((m) => (m.number === member.number ? { ...m, active: !m.active } : m)),
    )
  }

  if (phase === 'loading') return <p className="text-slate-500">{eu.common.loading}</p>
  if (phase === 'error') return <p className="text-red-600">{eu.common.error}</p>

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{eu.kudeaketa.members}</h1>
        <button
          type="button"
          onClick={() => setImporting(true)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
        >
          {eu.kudeaketa.importCsv}
        </button>
      </div>

      {/* Alta manual */}
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">{eu.kudeaketa.memberNumber}</span>
          <input
            inputMode="numeric"
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            className="w-28 rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 flex-1 min-w-40">
          <span className="text-xs text-slate-500">{eu.kudeaketa.name}</span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-brand text-white font-semibold px-4 py-2"
        >
          {eu.kudeaketa.newMember}
        </button>
      </form>
      {addError && (
        <p className="text-sm text-red-600" role="alert">
          {addError}
        </p>
      )}

      {/* Búsqueda */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={eu.common.search}
        className="rounded-lg border border-slate-300 px-3 py-2"
      />
      <p className="text-xs text-slate-400">
        {eu.kudeaketa.membersCount}: {members.length}
      </p>

      {/* Listado */}
      <ul className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {filtered.map((m) => (
          <li key={m.number} className="flex items-center gap-3 px-3 py-2">
            <span className="w-14 shrink-0 text-sm text-slate-400">#{m.number}</span>
            {editingNumber === m.number ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
                className="flex-1 rounded-lg border border-slate-300 px-2 py-1"
              />
            ) : (
              <span className={`flex-1 ${m.active ? '' : 'text-slate-400 line-through'}`}>
                {m.name}
              </span>
            )}

            {editingNumber === m.number ? (
              <>
                <button
                  type="button"
                  onClick={() => void saveEdit(m.number)}
                  className="text-sm font-semibold text-slate-900"
                >
                  {eu.common.save}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingNumber(null)}
                  className="text-sm text-slate-500"
                >
                  {eu.common.cancel}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => startEdit(m)}
                  className="text-sm text-slate-500 hover:text-slate-900"
                >
                  {eu.kudeaketa.edit}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleActive(m)}
                  className={`text-sm font-medium ${
                    m.active ? 'text-slate-500 hover:text-red-600' : 'text-green-600'
                  }`}
                >
                  {m.active ? eu.kudeaketa.deactivate : eu.kudeaketa.activate}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {importing && (
        <ImportCsvDialog
          existing={members}
          onClose={() => setImporting(false)}
          onApplied={() => void load()}
        />
      )}
    </section>
  )
}
