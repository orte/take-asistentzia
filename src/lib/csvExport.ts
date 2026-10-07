// Generación y descarga de CSV para Excel en español: separador `;` y BOM
// (PLAN §7.4). `toCsv` es pura y testeable; `downloadCsv` hace la descarga.

const SEPARATOR = ';'
const NEWLINE = '\r\n'
const BOM = String.fromCharCode(0xfeff)

function escapeField(value: string | number): string {
  const text = String(value)
  if (/[";\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function toCsv(
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<string | number>>,
): string {
  return [headers, ...rows]
    .map((cols) => cols.map(escapeField).join(SEPARATOR))
    .join(NEWLINE)
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// Deja un nombre de fichero seguro (sin barras ni caracteres raros).
export function safeFilename(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
}
