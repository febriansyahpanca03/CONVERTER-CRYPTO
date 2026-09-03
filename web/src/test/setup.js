import { afterEach } from "vitest";

/* Setup ini jalan untuk SEMUA file tes, termasuk yang lingkungannya "node"
   (tes lib/ yang murni fungsi). Karena itu bagian yang butuh DOM diimpor
   secara kondisional — @testing-library/react melempar error kalau diimpor
   di lingkungan tanpa `document`. */
if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
  const { cleanup } = await import("@testing-library/react");

  // Tanpa ini, DOM dari tes sebelumnya menumpuk dan query seperti
  // getByText bisa menemukan elemen milik tes lain.
  afterEach(cleanup);
}
