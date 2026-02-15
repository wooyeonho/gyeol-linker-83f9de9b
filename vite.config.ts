import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { componentTagger } from 'lovable-tagger';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  define: {
    'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://ambadtjrwwaaobrbzjar.supabase.co'),
    'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtYmFkdGpyd3dhYW9icmJ6amFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNjYwMjMsImV4cCI6MjA4NjY0MjAyM30.iVbn5zt5rWe2UdEsGd11dTX1JxjyWPKt_iPHoWdfhmQ'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    host: '::',
    port: 8080,
  },
}));
