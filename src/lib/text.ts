// Normalización de texto para búsquedas: sin distinguir mayúsculas ni tildes
// (PLAN §7.1). Función pura.
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    // quita diacríticos (marcas combinantes U+0300–U+036F)
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}
