import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['localhost', '127.0.0.1'],
    watch: {
      usePolling: process.platform === 'win32',
      interval: 300,
      ignored: ['**/data/**', '**/docs/**', '**/LICENSE', '**/.git/**'],
    },
  },
});
