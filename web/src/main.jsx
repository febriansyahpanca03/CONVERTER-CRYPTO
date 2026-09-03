import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* Jaring pengaman terakhir: kalau ada yang lolos dari boundary yang    */}
    {/* lebih dalam, pengunjung tetap dapat pesan + tombol muat ulang,       */}
    {/* bukan halaman putih kosong tanpa penjelasan.                         */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
