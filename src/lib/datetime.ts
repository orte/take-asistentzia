// Utilidades de fecha/hora en la zona horaria del pabellón (PLAN §7.1).
const TZ = 'Europe/Madrid'

// Fecha 'YYYY-MM-DD' correspondiente a un instante, en horario de Madrid.
// 'en-CA' produce el formato ISO corto.
export function madridDateString(instant: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
}

// Hora 'HH:MM' de un timestamp ISO, en horario de Madrid.
export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

// Fecha legible 'dd/mm/yyyy' de 'YYYY-MM-DD', sin líos de zona horaria
// (es solo una fecha, no un instante).
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}
