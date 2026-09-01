const SAMPLES = ["250 USDT ke ETH", "1 BTC ke IDR", "0.5 ETH ke SOL", "10 SOL ke DOGE"];

/* Cara alternatif: ketik kalimat bebas, tetap dipertahankan sebagai     */
/* fitur tambahan — bukan lagi satu-satunya cara input.                 */
export default function QuickCommand({ query, onQueryChange, onRun, status }) {
  const loading = status === "loading";

  return (
    <div className="psa-card psa-quick">
      <div className="psa-quick-head">
        <span className="psa-quick-title">Quick Command</span>
        <span className="psa-quick-badge">Bahasa natural</span>
      </div>
      <div className="psa-quick-row">
        <label htmlFor="psa-quick-input" className="visually-hidden">
          Perintah bahasa natural, contoh 250 USDT ke ETH
        </label>
        <input
          id="psa-quick-input"
          className="psa-quick-input"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onRun(query)}
          placeholder="Contoh: 250 USDT ke ETH"
          disabled={loading}
        />
        <button
          className="psa-quick-go"
          onClick={() => onRun(query)}
          disabled={loading}
          aria-label="Jalankan Quick Command"
          title="Jalankan"
        >
          {loading ? "…" : "→"}
        </button>
      </div>
      <div className="psa-chip-row">
        {SAMPLES.map((s) => (
          <button
            key={s}
            className="psa-chip"
            onClick={() => {
              onQueryChange(s);
              onRun(s);
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
