import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

// GitHub Pages friendly config:
// - base: './' makes the built assets work from any sub-path.
export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
  };
});
