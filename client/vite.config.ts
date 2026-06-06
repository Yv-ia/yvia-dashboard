import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Passerelle : toute demande qui commence par "/api" est transmise
    // au serveur Hono (la cuisine) qui tourne sur le port 3000.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
