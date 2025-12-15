import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load from .env files (local dev) or fall back to process.env (Docker/Cloud Run)
    const env = loadEnv(mode, '.', '');
    
    // Prefer process.env (for Docker builds), fall back to loadEnv (for local .env files)
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
