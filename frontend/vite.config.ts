import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',   // accessible depuis tout le réseau local
    port: 5173,
    strictPort: true,  // échoue si le port est déjà pris
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
});