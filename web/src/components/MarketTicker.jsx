import { useEffect, useState } from "react";
import { COINS, TICKER_SYMS } from "../data/assets.js";
import { fetchTickerPrices } from "../lib/api.js";
import { formatAmount } from "../lib/format.js";

/* Pita harga berjalan. Diperbaiki dari versi sebelumnya:                */
/*  - label "LIVE MARKET" di kiri supaya jelas fungsinya                 */
/*  - tepi kiri/kanan pudar (mask), bukan terpotong tegas                */
/*  - animasi lambat (110s) supaya terbaca, tanpa bagian kosong          */
/*  - berhenti saat di-hover (CSS :hover)                                */
/*  - warna + ikon panah, bukan warna saja                               */
/*  - item bisa diklik untuk mengisi converter                           */
/*  - di layar sempit, marquee diganti satu kartu harga yang bergantian  */
export default function MarketTicker({ onSelect }) {
  const [prices, setPrices] = useState(null);
  const [mobileIndex, setMobileIndex] = useState(0);

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

  useEffect(() => {
    const id = setInterval(() => setMobileIndex((i) => (i + 1) % TICKER_SYMS.length), 3000);
    return () => clearInterval(id);
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

  const mobileItem = items[mobileIndex] || items[0];
  const mobileUp = typeof mobileItem?.change === "number" && mobileItem.change >= 0;

  return (
    <div className="psa-ticker" id="market" role="region" aria-label="Harga pasar berjalan">
      <h2 className="psa-ticker-label">
        <span className="psa-ticker-dot" aria-hidden="true" />
        <span className="psa-live-text">Live Market</span>
      </h2>
      <div className="psa-ticker-viewport">
        <div className="psa-ticker-track">
          {renderItems("a")}
          {renderItems("b")}
        </div>
      </div>

      <button
        className="psa-ticker-mobile"
        onClick={() => mobileItem && onSelect?.(mobileItem.sym)}
        title={mobileItem ? `Pakai ${mobileItem.sym.toUpperCase()} di converter` : undefined}
      >
        {mobileItem && (
          <span key={mobileItem.sym} className="psa-ticker-mobile-row">
            <span className="psa-ticker-sym">{mobileItem.sym.toUpperCase()}</span>
            <span className="psa-ticker-price">
              {mobileItem.price != null ? `$${formatAmount(mobileItem.price, "usd")}` : "…"}
            </span>
            {typeof mobileItem.change === "number" && (
              <span className={`psa-ticker-change ${mobileUp ? "psa-ticker-up" : "psa-ticker-down"}`}>
                {mobileUp ? "▲" : "▼"} {Math.abs(mobileItem.change).toFixed(1)}%
              </span>
            )}
          </span>
        )}
      </button>
    </div>
  );
}
