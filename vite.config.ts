
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 3000,
    hmr: {
      overlay: false // Faster recovery from errors
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'recharts', 'jspdf', 'xlsx']
  },
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true
  }
})
