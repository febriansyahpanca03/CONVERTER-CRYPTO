import { useEffect, useState } from "react";
import { COINS, TICKER_SYMS } from "../data/assets.js";
import { fetchTickerPrices } from "../lib/api.js";
import { formatAmount } from "../lib/format.js";

/* Pita harga berjalan. Diperbaiki dari versi sebelumnya:                */
/*  - label "Market" di kiri supaya jelas fungsinya                      */
/*  - tepi kiri/kanan pudar (mask), bukan terpotong tegas                */
/*  - animasi diperlambat (90s, dari 45s) supaya terbaca                 */
/*  - berhenti saat di-hover (CSS :hover)                                */
/*  - warna + ikon panah, bukan warna saja                               */
/*  - item bisa diklik untuk mengisi converter                           */
export default function MarketTicker({ onSelect }) {
  const [prices, setPrices] = useState(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const data = await fetchTickerPrices();
        if (alive) setPrices(data);
      } catch {
        /* ticker cuma hiasan informatif, jangan ganggu alur utama kalau gagal */
      }
    }
    load();
    const id = setInterval(load, 45_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const items = TICKER_SYMS.map((sym) => {
    const entry = prices?.[COINS[sym].id];
    return { sym, price: entry?.usd, change: entry?.usd_24h_change };
  });

  const renderItems = (keyPrefix) =>
    items.map(({ sym, price, change }) => {
      const up = typeof change === "number" && change >= 0;
      const down = typeof change === "number" && change < 0;
      return (
        <button
          key={`${keyPrefix}-${sym}`}
          className="psa-ticker-item"
          onClick={() => onSelect?.(sym)}
          title={`Pakai ${sym.toUpperCase()} di converter`}
        >
          <span className="psa-ticker-sym">{sym.toUpperCase()}</span>
          <span className="psa-ticker-price">{price != null ? `$${formatAmount(price, "usd")}` : "…"}</span>
          {typeof change === "number" && (
            <span className={`psa-ticker-change ${up ? "psa-ticker-up" : down ? "psa-ticker-down" : ""}`}>
              {up ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </button>
      );
    });

  return (
    <div className="psa-ticker" id="market" role="region" aria-label="Harga pasar berjalan">
      <span className="psa-ticker-label">
        <span className="psa-ticker-dot" aria-hidden="true" />
        Market
      </span>
      <div className="psa-ticker-viewport">
        <div className="psa-ticker-track">
          {renderItems("a")}
          {renderItems("b")}
        </div>
      </div>
    </div>
  );
}
