import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { sveltePreprocess } from 'svelte-preprocess';

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  // plugins: [svelte()],
  plugins: [
    svelte({
      preprocess: [
        sveltePreprocess({
          typescript: true,
        }),
      ],
      onwarn: (warning, handler) => {
        // disable a11y warnings
        if (warning.code.startsWith('a11y-')) return;
        if (warning.code.includes('Unused CSS selector')) return;
        handler(warning);
      },
    }),
  ],
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
