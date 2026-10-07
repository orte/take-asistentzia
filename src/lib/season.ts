// Temporada a partir de una fecha 'YYYY-MM-DD'. Corte el 1 de julio:
// de julio en adelante empieza temporada nueva (PLAN §7.4).
// Ej.: '2026-10-07' -> '2026-27'; '2027-03-01' -> '2026-27'.
export function seasonForDate(date: string): string {
  const [yearStr, monthStr] = date.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new Error(`Data baliogabea: ${date}`)
  }
  const startYear = month >= 7 ? year : year - 1
  const endShort = String((startYear + 1) % 100).padStart(2, '0')
  return `${startYear}-${endShort}`
}
