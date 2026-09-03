import { useEffect, useState } from "react";
import { IconSwapVertical, IconMenu, IconClose } from "./Icons.jsx";

const LINKS = [
  { href: "#converter", label: "Converter" },
  { href: "#market", label: "Market" },
  { href: "#about", label: "About" },
];

/* Header minimal: logo + nama produk, dan navigasi ke 3 bagian halaman  */
/* (bukan wallet/transaksi — produk ini murni alat hitung, bukan tempat */
/* menukar aset sungguhan, jadi sengaja tidak ada tombol "Connect       */
/* Wallet").                                                            */
export default function Header() {
  const [open, setOpen] = useState(false);
  /* Header punya dua kondisi: nyaris transparan saat halaman di paling
     atas, lalu gelap + blur setelah discroll. Ambangnya 8px supaya tidak
     berganti-ganti saat halaman cuma bergetar sedikit. */
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // passive: listener ini tidak pernah memanggil preventDefault, jadi
    // browser boleh menggulir tanpa menunggunya.
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); // kondisi awal, mis. saat halaman dibuka dalam keadaan ter-scroll
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`psa-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="psa-header-inner">
        <a href="#converter" className="psa-logo" aria-label="Panca Swap, ke bagian converter">
          <span className="psa-logo-mark" aria-hidden="true">
            <IconSwapVertical size={17} />
          </span>
          <span className="psa-logo-name">Panca Swap</span>
        </a>

        <nav className="psa-nav" aria-label="Navigasi utama">
          {LINKS.map((l, i) => (
            <a key={l.href} href={l.href} className={i === 0 ? "active" : undefined}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="psa-header-right">
          <span className="psa-live-indicator" title="Harga diambil langsung dari CoinGecko">
            <span className="psa-live-dot" aria-hidden="true" />
            <span className="psa-live-text">Live Market</span>
          </span>

          <button
            className="psa-menu-btn"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Tutup menu" : "Buka menu"}
          >
            {open ? <IconClose size={18} /> : <IconMenu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <nav aria-label="Navigasi mobile" className="psa-mobile-nav">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
