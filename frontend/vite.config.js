import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    cors: {
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'e2b-traffic-access-token', 'x-demo-bypass', 'x-bypass-auth'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    // Performance: code splitting, smaller chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libs into separate chunks
          vendor: ['react', 'react-dom', 'react-router-dom'],
          icons: ['react-icons'],
          axios: ['axios'],
        },
      },
    },
    chunkSizeWarningLimit: 500, // warn if chunk >500kb
    minify: 'esbuild', // fast minify
    sourcemap: false, // no sourcemap in prod for smaller size
  },
})
