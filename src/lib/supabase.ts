import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY. ' +
      'Copia .env.example a .env.local y rellena los valores.',
  )
}

// Email del único admin: la pantalla de login solo pide la contraseña (PLAN §6).
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    // Sesión persistente en el dispositivo: el registrador no vuelve a entrar
    // en mitad de un partido (PLAN §6).
    persistSession: true,
    autoRefreshToken: true,
    // No usamos flujos OAuth con redirección, así que no hay que leer la URL.
    detectSessionInUrl: false,
  },
})
