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
    // Tes lib/ murni fungsi jadi sebenarnya tidak butuh DOM, tapi tes
    // komponen butuh — jsdom dipakai untuk keduanya biar satu konfigurasi.
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
  },
});
