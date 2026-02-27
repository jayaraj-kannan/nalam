import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Performance optimizations
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'aws-vendor': ['aws-amplify', '@aws-amplify/ui-react'],
          'chart-vendor': ['recharts'],
          // Feature-based chunks
          'dashboard': [
            './src/components/dashboard/PrimaryUserDashboard.tsx',
            './src/components/dashboard/SecondaryUserDashboard.tsx',
          ],
          'health': [
            './src/components/health/HealthDataEntryForm.tsx',
          ],
          'medication': [
            './src/components/medication/MedicationManagement.tsx',
            './src/components/medication/MedicationNotification.tsx',
          ],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
  },
  publicDir: 'public',
  // Performance optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'aws-amplify'],
  },
});
