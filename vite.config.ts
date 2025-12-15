import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load from .env files (for local dev only)
    const env = loadEnv(mode, '.', '');
    
    // Get env var with fallback to undefined (Cloud Run will inject at runtime)
    const getEnvVar = (key: string) => {
      return process.env[key] || env[key] || undefined;
    };
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // For local dev: Use .env files
        // For Cloud Run: These will be undefined at build time, injected at runtime via window.__ENV__
        'process.env.GOOGLE_API_KEY': JSON.stringify(getEnvVar('GOOGLE_API_KEY') || getEnvVar('GEMINI_API_KEY')),
        'process.env.OPENAI_API_KEY': JSON.stringify(getEnvVar('OPENAI_API_KEY')),
        'process.env.ANTHROPIC_API_KEY': JSON.stringify(getEnvVar('ANTHROPIC_API_KEY')),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
