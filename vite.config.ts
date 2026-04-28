import path from 'path';
import { defineConfig } from 'vite';
import tailwind from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 5000,
        host: '0.0.0.0',
        allowedHosts: true as const,
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
        },
      },
      plugins: [
        tailwind(),
        react()
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
