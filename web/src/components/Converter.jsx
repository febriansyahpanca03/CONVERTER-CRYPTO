import { useEffect, useRef, useState } from "react";
import CoinSelect from "./CoinSelect.jsx";
import PriceMeta from "./PriceMeta.jsx";
import { formatAmountSafe } from "../lib/format.js";
import {
  IconSwapVertical,
  IconBolt,
  IconInfo,
  IconCopy,
  IconCheck,
  IconShare,
  IconStar,
  IconChevronDown,
} from "./Icons.jsx";

const SAMPLES = ["250 USDT ke ETH", "1 BTC ke IDR", "0.5 ETH ke SOL", "10 SOL ke DOGE"];

/* Durasi count-up hasil konversi. Cukup lama untuk terbaca sebagai
   "menghitung", masih jauh dari terasa lambat saat dipakai berulang. */
const COUNT_UP_MS = 380;

/* Menganimasikan angka hasil dari nilai sebelumnya ke nilai baru.

   Sengaja menulis langsung ke DOM lewat ref, BUKAN setState per frame:
   satu konversi akan memicu ~23 render kalau pakai state, padahal yang
   berubah cuma teks di satu elemen. Ini juga menghindari efek yang
   memanggil setState di setiap frame.

   Nilai akhirnya tetap dirender React lewat JSX, jadi kalau animasinya
   dilewati (reduced-motion) atau di-unmount di tengah jalan, teks yang
   tampil tetap benar. */
function useCountUp(ref, target, formatter, aktif) {
  const sebelumnya = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const dari = sebelumnya.current;
    // HANYA disimpan saat target-nya angka. Sebelumnya nilai ini juga
    // di-null-kan setiap target null, padahal di antara dua konversi selalu
    // ada satu render berstatus 'loading' dengan target null — akibatnya
    // nilai awal selalu hilang dan animasinya tidak pernah jalan.
    if (Number.isFinite(target)) sebelumnya.current = target;

    if (!el || !aktif || !Number.isFinite(target)) return undefined;
    // Tidak ada nilai awal (hasil pertama) atau nilainya sama — tidak ada
    // yang perlu dihitung, biarkan React yang menampilkannya.
    if (!Number.isFinite(dari) || dari === target) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;

    let raf;
    const t0 = performance.now();
    function langkah(t) {
      // Dijepit di kedua ujung. Batas bawahnya penting: timestamp yang
      // diberikan requestAnimationFrame adalah waktu MULAI frame, yang bisa
      // lebih awal dari performance.now() saat animasi dijadwalkan. Tanpa
      // Math.max(0), progresnya negatif dan easing-nya melempar nilai ke
      // bawah nilai awal — sempat terlihat sebagai angka MINUS sepersekian
      // detik di kolom hasil.
      const p = Math.min(1, Math.max(0, (t - t0) / COUNT_UP_MS));
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic: cepat lalu melandai
      el.textContent = formatter(dari + (target - dari) * eased);
      if (p < 1) raf = requestAnimationFrame(langkah);
    }
    raf = requestAnimationFrame(langkah);
    return () => cancelAnimationFrame(raf);
    // formatter dibuat ulang tiap render tapi isinya stabil per toSym;
    // memasukkannya ke deps akan me-restart animasi tanpa alasan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, aktif]);
}

/* Satu kartu utama: Quick Command di atas (buat yang mau ketik bebas),  */
/* form terstruktur di bawahnya (buat yang mau pilih manual) — dua-duanya */
/* berbagi hasil yang sama, bukan dua fitur terpisah.                    */
export default function Converter({
  amount,
  onAmountChange,
  fromSym,
  onFromChange,
  toSym,
  onToChange,
  onSwap,
  onConvert,
  status,
  result,
  amountError,
  icons,
  query,
  onQueryChange,
  onRunQuickCommand,
  message,
  offline,
  onRefresh,
  onCopyResult,
  justCopied,
  onShare,
  onToggleFavorite,
  isFavorite,
}) {
  const loading = status === "loading";
  const showResult = status === "done" && result;
  /* Aset asal dan tujuan sama (mis. dari deep link ?from=eth&to=eth).
     Ini BUKAN error — tidak ada yang salah diketik pengguna, cuma belum
     ada yang bisa dihitung. Karena itu tampilannya informasi cyan, bukan
     peringatan merah. */
  const pasanganSama = fromSym === toSym;

  /* Sumber kebenaran tunggal untuk "boleh dikonversi atau belum".
     Dipakai bersama oleh tombol Konversi (disabled) dan tampilan hasil
     (placeholder), supaya keduanya tidak pernah saling bertentangan —
     mis. tombol aktif padahal isinya bukan angka.
     Validasinya sengaja dibuat longgar (hanya cek dapat-dihitung dan > 0)
     dan TIDAK menggantikan validasi asli di App.convert(), yang tetap
     jadi penentu akhir beserta pesan errornya. */
  const jumlahValid = (() => {
    const t = String(amount).trim();
    if (!t) return false;
    const nilai = Number(t.replace(",", "."));
    return Number.isFinite(nilai) && nilai > 0;
  })();
  const bisaKonversi = jumlahValid && !pasanganSama;

  /* Tiga tujuan populer yang ditawarkan saat pasangannya sama. Yang sama
     dengan aset asal disaring, jadi chip-nya tidak pernah menawarkan
     pasangan yang sama lagi. */
  const saranTujuan = ["idr", "usdt", "btc"].filter((s) => s !== fromSym).slice(0, 3);
  /* Label pintasan mengikuti papan ketik penggunanya: di macOS tombolnya
     Command, bukan Control. */
  const pintasanKonversi =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "")
      ? "⌘ ↵"
      : "Ctrl ↵";
  const amountRef = useRef(null);
  const angkaRef = useRef(null);
  const resultDisplay = showResult ? formatAmountSafe(result.value, toSym) : null;
  useCountUp(
    angkaRef,
    showResult ? result.value : null,
    (v) => formatAmountSafe(v, toSym).text,
    showResult
  );
  // Putaran 180 derajat tiap klik tombol swap — bukan cuma efek hover,
  // biar terasa sebagai respons nyata terhadap aksi pengguna.
  const [swapTurns, setSwapTurns] = useState(0);
  // Quick Command cuma fitur pelengkap (form terstruktur di bawahnya yang
  // utama) — default terbuka di desktop, tertutup di mobile biar kalkulator
  // nggak kepanjangan di layar pendek. Formnya sendiri TIDAK pernah ikut
  // disembunyikan, cuma bagian Quick Command-nya.
  const [qcOpen, setQcOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia?.("(min-width: 640px)").matches ?? true;
  });

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  function handleSwap() {
    setSwapTurns((n) => n + 1);
    onSwap();
  }

  return (
    <div className="psa-converter">
      <h2 className="psa-converter-title">Crypto Converter</h2>

      <div className="psa-qc">
        <div className="psa-qc-head">
          <div className="psa-qc-head-label">
            <span className="psa-qc-label">Quick Command</span>
            {/* role="note" wajib ada: aria-label tidak diizinkan di <span>   */}
            {/* polos tanpa role, dan tanpa role pembaca layar boleh          */}
            {/* mengabaikan labelnya sama sekali (terdeteksi axe-core sebagai */}
            {/* aria-prohibited-attr). "note" = informasi pelengkap.          */}
            <span
              className="psa-info-dot"
              role="note"
              tabIndex={0}
              title="Ketik kalimat bebas, misalnya “250 USDT ke ETH”, terus tekan Proses."
              aria-label="Info Quick Command"
            >
              <IconInfo size={13} />
            </span>
          </div>
          <button
            type="button"
            className={`psa-qc-toggle ${qcOpen ? "is-open" : ""}`}
            onClick={() => setQcOpen((v) => !v)}
            aria-expanded={qcOpen}
            aria-controls="psa-qc-body"
          >
            {qcOpen ? "Sembunyikan" : "Tampilkan"}
            <IconChevronDown size={14} />
          </button>
        </div>
        {qcOpen && (
          <div id="psa-qc-body">
            <div className="psa-qc-row">
              <IconBolt size={16} className="psa-qc-icon" aria-hidden="true" />
              <label htmlFor="psa-quick-input" className="visually-hidden">
                Perintah bahasa natural, contoh 250 USDT ke ETH
              </label>
              <input
                id="psa-quick-input"
                className="psa-qc-input"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onRunQuickCommand(query)}
                placeholder="Contoh: 250 USDT ke ETH"
                disabled={loading}
                aria-keyshortcuts="/"
              />
              {/* Hint pintasan, desktop saja. aria-hidden karena informasinya
                  sudah disampaikan lewat aria-keyshortcuts di input-nya. */}
              <span className="psa-kbd" aria-hidden="true">
                /
              </span>
              <button
                className="psa-qc-go"
                onClick={() => onRunQuickCommand(query)}
                disabled={loading}
              >
                {loading ? "…" : "Proses"}
              </button>
            </div>
            <div className="psa-chip-scroll">
              <div className="psa-chip-row">
                {SAMPLES.map((s) => (
                  <button
                    key={s}
                    className={`psa-chip ${query === s ? "is-active" : ""}`}
                    onClick={() => {
                      onQueryChange(s);
                      onRunQuickCommand(s);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="psa-divider" />

      <div className="psa-field">
        {/* Nggak ada tombol salin di sini — nilai yang baru saja diketik   */}
        {/* sendiri nggak perlu disalin, cuma hasil (di bawah) yang perlu.  */}
        <div className="psa-field-label">Anda membayar</div>
        <div className="psa-field-row">
          <label htmlFor="psa-amount" className="visually-hidden">
            Jumlah yang dibayar
          </label>
          <input
            id="psa-amount"
            ref={amountRef}
            className="psa-amount-input"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onConvert()}
            aria-invalid={Boolean(amountError)}
            aria-describedby={amountError ? "psa-amount-error" : undefined}
          />
          <CoinSelect value={fromSym} onChange={onFromChange} icons={icons} label="Aset asal" />
        </div>
        {amountError && (
          <div className="psa-field-hint" id="psa-amount-error" role="alert">
            {amountError}
          </div>
        )}
      </div>

      <div className="psa-swap-row">
        <button
          className="psa-swap-btn"
          onClick={handleSwap}
          /* Menukar dua aset yang sama tidak mengubah apa pun. */
          disabled={loading || pasanganSama}
          title="Tukar arah aset"
          aria-label="Tukar arah aset asal dan tujuan"
          style={{ transform: `rotate(${swapTurns * 180}deg)`, transitionDuration: "280ms" }}
        >
          <IconSwapVertical size={18} />
        </button>
      </div>

      <div className="psa-field">
        <div className="psa-field-top">
          <span className="psa-field-label">Anda menerima</span>
          <button
            className="psa-field-copy"
            onClick={onCopyResult}
            title="Salin hasil"
            aria-label="Salin hasil"
            disabled={!showResult}
            type="button"
          >
            {justCopied ? <IconCheck size={13} /> : <IconCopy size={13} />}
          </button>
        </div>
        <div className="psa-field-row">
          <span
            key={showResult ? `${result.from}-${result.to}-${result.value}-${result.updatedAt}` : "empty"}
            className={`psa-result-value ${showResult ? "psa-result-pop" : ""}`}
            aria-live="polite"
            title={resultDisplay?.isApprox ? `Nilai lengkap: ${resultDisplay.full} ${toSym.toUpperCase()}` : undefined}
          >
            {/* Angka yang dianimasikan di-aria-hidden: tanpa ini pembaca   */}
            {/* layar akan membacakan setiap frame count-up-nya.            */}
            {/* Placeholder "—", bukan "0": angka nol itu hasil konversi   */}
            {/* yang sah, jadi menampilkannya sebelum pengguna mengisi apa   */}
            {/* pun membuat keadaan kosong tidak bisa dibedakan dari hasil.  */}
            <span
              ref={angkaRef}
              aria-hidden="true"
              className={showResult ? "" : "psa-result-empty"}
            >
              {loading && !pasanganSama ? "0.00" : resultDisplay && !pasanganSama ? resultDisplay.text : "—"}
            </span>
            {/* Nilai final, diumumkan sekali saja. */}
            <span className="visually-hidden">
              {loading ? "Menghitung" : resultDisplay ? `${resultDisplay.text} ${toSym.toUpperCase()}` : ""}
            </span>
          </span>
          <CoinSelect value={toSym} onChange={onToChange} icons={icons} label="Aset tujuan" />
        </div>
        {/* Tingginya dipesan lewat CSS (min-height) supaya baris ini tidak  */}
        {/* mendorong layout saat berganti antara hint dan kosong.          */}
        <div className="psa-result-hint">
          {!pasanganSama && !showResult && !loading && "Masukkan jumlah untuk melihat hasil"}
        </div>

        {pasanganSama && (
          <div className="psa-same-pair" role="status">
            <p className="psa-same-pair-text">
              Pilih aset tujuan yang berbeda untuk melakukan konversi.
            </p>
            <div className="psa-same-pair-chips">
              {saranTujuan.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="psa-chip psa-same-pair-chip"
                  /* Hanya tujuannya yang diganti — jumlah yang sudah diketik
                     pengguna sengaja dibiarkan apa adanya. */
                  onClick={() => onToChange(s)}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Kurs "1 ETH = 1 ETH" tidak memberi informasi apa pun. */}
      {!pasanganSama && (
      <PriceMeta
        variant="inline"
        status={status}
        result={result}
        message={message}
        offline={offline}
        fromSym={fromSym}
        toSym={toSym}
        onRefresh={onRefresh}
      />
      )}

      {showResult && !pasanganSama && (
        <div className="psa-result-actions">
          <button className="psa-icon-btn" onClick={onShare} title="Bagikan hasil" aria-label="Bagikan hasil">
            <IconShare size={15} />
          </button>
          <button
            className={`psa-icon-btn ${isFavorite ? "is-fav" : ""}`}
            onClick={onToggleFavorite}
            title={isFavorite ? "Hapus dari favorit" : "Tambah ke favorit"}
            aria-label={isFavorite ? "Hapus dari favorit" : "Tambah ke favorit"}
          >
            <IconStar size={15} filled={isFavorite} />
          </button>
        </div>
      )}

      <button
        className="psa-convert-btn"
        onClick={onConvert}
        disabled={loading || !bisaKonversi}
        aria-describedby={!bisaKonversi && !loading ? "psa-cta-alasan" : undefined}
        aria-keyshortcuts="Control+Enter Meta+Enter"
      >
        {loading && <span className="psa-spinner" aria-hidden="true" />}
        {loading ? "Menghitung…" : "Konversi"}
        {!loading && (
          <span className="psa-kbd" aria-hidden="true">
            {pintasanKonversi}
          </span>
        )}
      </button>
      {/* Alasan tombol mati, khusus pembaca layar — secara visual sudah   */}
      {/* dijelaskan oleh hint di bawah kolom hasil.                       */}
      <span id="psa-cta-alasan" className="visually-hidden">
        {pasanganSama
          ? "Pilih aset tujuan yang berbeda untuk mengaktifkan tombol konversi"
          : "Isi jumlah lebih dari nol untuk mengaktifkan tombol konversi"}
      </span>
    </div>
  );
}
