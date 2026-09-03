import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Tanpa ini, DOM dari tes sebelumnya menumpuk dan query seperti
// getByText bisa menemukan elemen milik tes lain.
afterEach(cleanup);
