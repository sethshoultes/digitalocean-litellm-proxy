import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'LiteLLM Connection Manager',
          short_name: 'LiteLLM Admin',
          description: 'Enterprise admin dashboard for LiteLLM User Connection and Access Management',
          theme_color: '#1f2937',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true,
          skipWaiting: true
        }
      })
    ],
    
    // Path resolution
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@/components': path.resolve(__dirname, './src/components'),
        '@/pages': path.resolve(__dirname, './src/pages'),
        '@/services': path.resolve(__dirname, './src/services'),
        '@/hooks': path.resolve(__dirname, './src/hooks'),
        '@/utils': path.resolve(__dirname, './src/utils'),
        '@/types': path.resolve(__dirname, './src/types'),
        '@/assets': path.resolve(__dirname, './src/assets'),
        '@/styles': path.resolve(__dirname, './src/styles'),
        '@/contexts': path.resolve(__dirname, './src/contexts'),
        '@/layouts': path.resolve(__dirname, './src/layouts')
      }
    },

    // Development configuration
    server: {
      port: 3000,
      host: true,
      open: false,
      cors: true,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8001',
          changeOrigin: true,
          secure: false,
          ws: true
        }
      }
    },

    // Build configuration
    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode !== 'production',
      minify: mode === 'production' ? 'esbuild' : false,
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks for better caching
            'react-vendor': ['react', 'react-dom'],
            'router-vendor': ['react-router-dom'],
            'ui-vendor': ['@headlessui/react', '@heroicons/react', 'framer-motion'],
            'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
            'data-vendor': ['react-query', 'axios', 'zustand'],
            'chart-vendor': ['recharts'],
            'utils-vendor': ['date-fns', 'clsx', 'tailwind-merge', 'jwt-decode']
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },

    // Preview configuration
    preview: {
      port: 3000,
      host: true,
      cors: true
    },

    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },

    // CSS configuration
    css: {
      devSourcemap: true,
      postcss: './postcss.config.js'
    },

    // Testing configuration
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true
    },

    // Optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'react-query',
        'axios',
        'zustand',
        '@tanstack/react-table',
        '@headlessui/react',
        '@heroicons/react',
        'react-hook-form',
        'zod',
        'date-fns',
        'jwt-decode'
      ]
    }
  }
})