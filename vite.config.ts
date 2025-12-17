
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Crucial for Electron file protocol
  server: {
    port: 3000,
  },
  define: {
    // FIX: Only define the specific variable. 
    // Defining 'process.env': {...} replaces the whole object and breaks libraries relying on process.env existing.
    'process.env.API_KEY': JSON.stringify("AIzaSyDO2wvg7QptTPAJVk0sN_uqwf-PQralilM")
  }
})
