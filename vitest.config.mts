import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

// The UI's tests (the API part is tested with Jest)
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['src/ui/**/*.spec.ts'],
  },
});
