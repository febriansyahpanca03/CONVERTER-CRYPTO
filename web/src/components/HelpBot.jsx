import { useEffect, useRef, useState } from "react";

/* Maskot robot dipertahankan, tapi diperkecil jadi tombol bantuan       */
/* mengambang berisi FAQ statis singkat — bukan chat sungguhan supaya   */
/* tidak menjanjikan fitur yang belum ada.                               */
export default function HelpBot() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        !btnRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {open && (
        <div className="psa-help-panel" ref={panelRef} role="dialog" aria-label="Bantuan singkat">
          <h3>🤖 Bantuan singkat</h3>
          <p style={{ margin: "0 0 8px" }}>
            <strong style={{ color: "var(--text)" }}>Converter</strong> — pilih aset asal &amp; tujuan,
            masukkan jumlah, lalu klik Konversi.
          </p>
          <p style={{ margin: "0 0 8px" }}>
            <strong style={{ color: "var(--text)" }}>Quick Command</strong> — ketik kalimat bebas seperti
            “250 USDT ke ETH”, biarkan AI yang membacanya.
          </p>
          <p style={{ margin: 0 }}>
            Harga dari CoinGecko, hanya estimasi. Aplikasi ini alat hitung — tidak menyimpan dana atau
            melakukan transaksi apa pun.
          </p>
        </div>
      )}
      <button
        ref={btnRef}
        className="psa-help-bot"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Tutup bantuan" : "Buka bantuan"}
        title="Bantuan"
      >
        🤖
      </button>
    </>
  );
}
