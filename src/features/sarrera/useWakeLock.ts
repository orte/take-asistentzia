import { useEffect } from 'react'

// Mantiene la pantalla encendida mientras se registra (PLAN §7.1).
// Degrada en silencio si el navegador no soporta la API.
export function useWakeLock(): void {
  useEffect(() => {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
    }
    if (!nav.wakeLock) return

    let sentinel: WakeLockSentinelLike | null = null
    let released = false

    async function acquire() {
      try {
        sentinel = (await nav.wakeLock?.request('screen')) ?? null
      } catch {
        // p. ej. la pestaña no está visible: se reintenta en visibilitychange
      }
    }

    function onVisibility() {
      if (document.visibilityState === 'visible' && !released) void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisibility)
      void sentinel?.release().catch(() => undefined)
    }
  }, [])
}

interface WakeLockSentinelLike {
  release: () => Promise<void>
}
