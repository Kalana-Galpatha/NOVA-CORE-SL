import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // relative paths, so the built app also works when opened from any folder
  plugins: [react()],
});
