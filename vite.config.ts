/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Separamos el cliente de Supabase (la dependencia más grande) para que
        // se cachee aparte del código de la app, que cambia más a menudo.
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  test: {
    // La lógica de negocio con tests es pura (ver PLAN §10), no necesita DOM.
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
