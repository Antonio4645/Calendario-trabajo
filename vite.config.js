import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    port: 5173,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mi Calendario de Trabajo',
        short_name: 'Calendario',
        description: 'Gestión de turnos y calendario laboral',
        theme_color: '#4CAF50',
        icons: [
          {
            src: 'logo.png', // Asegúrate de tener este archivo en la carpeta /public
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,ico,txt}']
      }
    })
  ]
});