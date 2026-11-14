import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './', // relative URLs so the build works under https://<user>.github.io/<repo>/
  plugins: [tailwindcss()],
});
