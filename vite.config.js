import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: projectRoot,
  build: {
    outDir: 'dist',
  },
});
