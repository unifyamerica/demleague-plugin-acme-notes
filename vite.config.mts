import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// The plugin's SPA UI (`./ui`), as an ES module library for the DemLeagueOS SPA to bundle. The platform packages
// stay external: the SPA provides the one copy of Vue, PrimeVue and the SDK every plugin shares.
const EXTERNAL = [
  /^vue($|\/)/,
  /^pinia($|\/)/,
  /^primevue($|\/)/,
  /^primeicons($|\/)/,
  /^@unifyamerica\/demleague-plugin-sdk($|\/)/,
];

export default defineConfig({
  plugins: [
    vue(),
    {
      // The package is CommonJS (the API part), the UI build is ES modules
      name: 'mark-esm',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'package.json',
          source: '{ "type": "module" }\n',
        });
      },
    },
  ],
  build: {
    outDir: 'dist/ui',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: 'src/ui/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    // ℹ️ Each page is its own chunk, downloaded when it's first opened
    rolldownOptions: {
      external: EXTERNAL,
      output: { chunkFileNames: '[name]-[hash].js' },
    },
  },
});
