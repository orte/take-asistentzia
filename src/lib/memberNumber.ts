// Convierte un texto en un nº de socio válido: entero positivo, sin ceros a la
// izquierda significativos (PLAN §3.1). Devuelve null si no es válido.
export function parseMemberNumber(input: string): number | null {
  const trimmed = input.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const n = Number(trimmed)
  if (!Number.isSafeInteger(n) || n <= 0) return null
  return n
}
