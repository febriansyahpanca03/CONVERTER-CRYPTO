import { useState } from "react";

const LINKS = [
  { href: "#converter", label: "Converter" },
  { href: "#market", label: "Market" },
  { href: "#about", label: "Tentang" },
];

/* Header minimal: logo + nama produk, dan navigasi ke 3 bagian halaman  */
/* (bukan wallet/transaksi — produk ini murni alat hitung, bukan tempat */
/* menukar aset sungguhan, jadi sengaja tidak ada tombol "Connect       */
/* Wallet").                                                            */
export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="psa-header">
      <div className="psa-header-inner">
        <a href="#converter" className="psa-logo" aria-label="Panca Swap Agent, ke bagian converter">
          <span className="psa-logo-mark" aria-hidden="true">
            ⇅
          </span>
          <span className="psa-logo-text">
            <span className="psa-logo-name">Panca Swap Agent</span>
            <span className="psa-logo-tagline">Konverter kripto real-time</span>
          </span>
        </a>

        <nav className="psa-nav" aria-label="Navigasi utama">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>

        <button
          className="psa-menu-btn"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Tutup menu" : "Buka menu"}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <nav
          aria-label="Navigasi mobile"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#0c0e19",
            borderBottom: "1px solid var(--border-strong)",
            display: "flex",
            flexDirection: "column",
            padding: "8px 20px 16px",
          }}
        >
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                padding: "12px 0",
                borderBottom: "1px solid var(--border)",
                color: "var(--text)",
                textDecoration: "none",
                fontSize: 15,
              }}
            >
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
