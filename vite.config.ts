import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, '.', '');
  const landingEnv = loadEnv(mode, path.resolve(__dirname, 'apps/landing'), '');
  const env = { ...rootEnv, ...landingEnv };
  return {
    server: {
      // @ts-ignore
      allowedHosts: process.env.TEMPO === 'true' ? true : undefined,
      host: process.env.TEMPO === 'true' ? '0.0.0.0' : undefined,
      port: 3000,
      strictPort: process.env.TEMPO === 'true' ? false : true,
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
