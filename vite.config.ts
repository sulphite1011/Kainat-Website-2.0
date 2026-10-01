import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const adminUser = process.env.ADMIN_USERNAME || process.env.VITE_ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || 'kainat2026';

  return {
    plugins: [react()],
    envPrefix: ['VITE_', 'ADMIN_'],
    define: {
      'process.env.ADMIN_USERNAME': JSON.stringify(adminUser),
      'process.env.ADMIN_PASSWORD': JSON.stringify(adminPass),
      'process.env.VITE_ADMIN_USERNAME': JSON.stringify(adminUser),
      'process.env.VITE_ADMIN_PASSWORD': JSON.stringify(adminPass),
      'import.meta.env.ADMIN_USERNAME': JSON.stringify(adminUser),
      'import.meta.env.ADMIN_PASSWORD': JSON.stringify(adminPass),
      'import.meta.env.VITE_ADMIN_USERNAME': JSON.stringify(adminUser),
      'import.meta.env.VITE_ADMIN_PASSWORD': JSON.stringify(adminPass),
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || process.cwd(), './src'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
