import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
export default defineConfig({
  root: __dirname,
  plugins: [react(), tailwindcss()],
  cacheDir: path.resolve(__dirname, '../node_modules/.vite-celeb'),
  resolve: { dedupe: ['react','react-dom'], alias: { '@shared': path.resolve(__dirname, '../shared') } },
  server: { port: 4180, strictPort: true }
});
