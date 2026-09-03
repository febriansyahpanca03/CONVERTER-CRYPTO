import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  test: {
    // Default "node", BUKAN "jsdom": 39 dari 58 tes ada di lib/ dan murni
    // fungsi tanpa DOM sama sekali. Memaksa jsdom untuk semuanya bikin
    // waktu setup membengkak (sempat ~290 detik akumulatif di mesin lokal)
    // dan itu yang bikin runner CI yang lebih lambat kena timeout.
    // Tes yang memang butuh DOM menandai dirinya sendiri lewat docblock
    // `@vitest-environment jsdom` di baris pertama file.
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    // Runner CI (2 core, tanpa cache panas) jauh lebih lambat dari laptop.
    // Default vitest 5s/10s terlalu mepet untuk render komponen di jsdom.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
