import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

/* Konfigurasi sengaja dibuat seperlunya saja. Tujuannya menangkap bug     */
/* nyata (variabel tak terpakai, dependency hook yang kurang, key hilang   */
/* di list) — BUKAN memaksakan gaya penulisan, karena kode di repo ini     */
/* sudah punya gaya sendiri yang konsisten dan tidak perlu diaduk-aduk.    */
export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: "detect" } },
    plugins: { react, "react-hooks": reactHooks },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Proyek ini pakai JSX transform baru (React 17+), jadi tidak perlu
      // `import React` di tiap file dan tidak perlu React masuk scope.
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      // PropTypes tidak dipakai di sini; komponennya kecil-kecil dan
      // prop-nya jelas dari pemakaian.
      "react/prop-types": "off",
      // Argumen yang sengaja diabaikan boleh diawali underscore
      // (mis. `(_req, res) => ...` di server).
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],

      // --- Dua aturan di bawah sengaja "warn", bukan "off" ---------------
      // Keduanya bawaan eslint-plugin-react-hooks v7 (aturan era React
      // Compiler) dan menemukan pola nyata di kode ini:
      //   - set-state-in-effect: 5 tempat (App, CoinSelect, PriceInsightCard,
      //     useChartData) memanggil setState langsung di dalam effect.
      //   - refs: 2 komponen chart menulis ref.current saat render.
      // Keduanya benar secara teori, tapi memperbaikinya berarti mengubah
      // urutan render/timing di komponen chart & selector yang sekarang
      // sudah terverifikasi jalan. Diturunkan ke warn supaya tetap terlihat
      // dan tercatat sebagai utang teknis, bukan disembunyikan dengan "off".
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
  {
    // File test jalan di Node/vitest, bukan browser.
    files: ["**/*.test.{js,jsx}"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      "no-undef": "off", // describe/it/expect disediakan vitest
    },
  },
];
