import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

// ADMIN APP — independent Vite app, talks to the shared Mobler backend over /api
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:3000';
  return {
    root: __dirname,
    envDir: path.resolve(__dirname, '../..'),
    define: {
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(env.GOOGLE_MAPS_PLATFORM_KEY || ''),
    },
    plugins: [react(), tailwindcss()],
    // One shared node_modules at the repo root: make sure every file (including ../../shared)
    // resolves the same React instance.
    cacheDir: path.resolve(__dirname, '../../node_modules/.vite-admin'),
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@shared': path.resolve(__dirname, '../../shared'),
      },
    },
    server: {
      port: 5175,
      strictPort: true,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
      },
    },
    preview: {
      port: 5175,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
      },
    },
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
    },
  };
});
