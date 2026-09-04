import { useEffect, useRef, useState } from "react";
import { ASSET_LIST, isFiat } from "../data/assets.js";
import { displayAmount, formatPercent } from "../lib/format.js";
import CoinIcon from "./CoinIcon.jsx";
import { IconChevronDown, IconSearch } from "./Icons.jsx";
import { loadRecentCoins, pushRecentCoin } from "../lib/storage.js";

/* Dropdown aset yang bisa dicari, dengan navigasi keyboard penuh:       */
/*  - Enter membuka / memilih                                            */
/*  - Escape menutup dan mengembalikan fokus ke trigger                  */
/*  - Panah atas/bawah menavigasi daftar                                 */
/*  - Klik di luar menutup panel                                         */
export default function CoinSelect({ value, onChange, icons, label, prices }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState(() => loadRecentCoins());
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const triggerRef = useRef(null);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? ASSET_LIST.filter((a) => a.symbol.includes(q) || a.name.toLowerCase().includes(q))
    : ASSET_LIST;
  // Bagian "Baru dipakai" cuma tampil kalau daftar belum difilter, dan aset
  // yang sedang aktif di field ini sendiri tidak perlu diulang di situ.
  const recentAssets = q
    ? []
    : recent.map((sym) => ASSET_LIST.find((a) => a.symbol === sym)).filter((a) => a && a.symbol !== value);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setRecent(loadRecentCoins());
      const raf = requestAnimationFrame(() => searchRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function selectAsset(sym) {
    onChange(sym);
    setRecent(pushRecentCoin(sym));
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item) selectAsset(item.symbol);
    }
  }

  const current = ASSET_LIST.find((a) => a.symbol === value);
  const iconUrl = current?.id ? icons[current.id] : undefined;
  const listboxId = `coin-listbox-${label}`;

  function renderOption(a, i, keyPrefix) {
    const url = a.id ? icons[a.id] : undefined;
    // Harga dasar (bukan kurs pasangan) + perubahan 24 jam, kalau ada.
    // `prices` bisa null selagi masih dimuat, atau aset fiatnya tidak
    // punya entri usd_24h_change — dalam kedua kasus itu bagian harga
    // TIDAK dirender, bukan diisi placeholder yang terlihat seperti data.
    const entry = a.id ? prices?.[a.id] : null;
    const hargaUsd = entry?.usd;
    const perubahan = entry?.usd_24h_change;
    return (
      <button
        key={`${keyPrefix}-${a.symbol}`}
        id={`coin-opt-${label}-${a.symbol}`}
        type="button"
        role="option"
        aria-selected={a.symbol === value}
        className={`psa-coin-option ${i === activeIndex ? "is-active" : ""} ${a.symbol === value ? "is-selected" : ""}`}
        onMouseEnter={() => setActiveIndex(i)}
        onClick={() => selectAsset(a.symbol)}
      >
        <CoinIcon sym={a.symbol} iconUrl={url} />
        <span className="psa-coin-option-name">
          <span className="psa-coin-option-sym">{a.symbol.toUpperCase()}</span>
          <span className="psa-coin-option-full">{a.name}</span>
        </span>
        {!isFiat(a.symbol) && typeof hargaUsd === "number" && (
          <span className="psa-coin-option-price">
            {displayAmount(hargaUsd, "usd")}
            {typeof perubahan === "number" && (
              <span className={perubahan >= 0 ? "psa-ticker-up" : "psa-ticker-down"}>
                {" "}
                {perubahan >= 0 ? "▲" : "▼"} {formatPercent(perubahan)}
              </span>
            )}
          </span>
        )}
        {a.symbol === value && (
          <span className="psa-coin-option-check" aria-hidden="true">
            ✓
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="psa-coin-select" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="psa-coin-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}, saat ini ${value.toUpperCase()}, klik untuk ganti`}
      >
        <CoinIcon sym={value} iconUrl={iconUrl} />
        <span className="psa-coin-sym">{value.toUpperCase()}</span>
        <IconChevronDown size={14} className={`psa-coin-chevron ${open ? "is-open" : ""}`} />
      </button>

      {/* Backdrop cuma tampak (dan cuma menutup panel) di layar sempit —
          lihat CSS: di desktop elemen ini display:none, klik-luar untuk
          menutup popover sudah ditangani listener mousedown di atas. */}
      {open && (
        <div
          className="psa-coin-backdrop"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}
      {open && (
        <div className="psa-coin-panel">
          {/* Drag handle dekoratif — bottom sheet di mobile secara visual
              terasa bisa diseret, walau geser sungguhan tidak diimplementasikan
              (menutup tetap lewat backdrop/Escape/pilih item). */}
          <div className="psa-coin-sheet-handle" aria-hidden="true" />
          <div className="psa-coin-search-wrap">
            <IconSearch size={15} className="psa-coin-search-icon" />
            <label htmlFor={`coin-search-${label}`} className="visually-hidden">
              Cari aset untuk {label}
            </label>
            <input
              id={`coin-search-${label}`}
              ref={searchRef}
              className="psa-coin-search"
              placeholder="Cari BTC, Ethereum, Rupiah…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-activedescendant={
                filtered[activeIndex] ? `coin-opt-${label}-${filtered[activeIndex].symbol}` : undefined
              }
              autoComplete="off"
            />
          </div>
          <div className="psa-coin-list" role="listbox" id={listboxId}>
            {recentAssets.length > 0 && (
              <>
                <div className="psa-coin-group-label">Baru dipakai</div>
                {recentAssets.map((a) => renderOption(a, filtered.indexOf(a), "recent"))}
                <div className="psa-coin-group-label">Semua aset</div>
              </>
            )}
            {filtered.length === 0 && (
              <div className="psa-coin-empty">Tidak ada aset yang cocok dengan “{query}”.</div>
            )}
            {filtered.map((a, i) => renderOption(a, i, "all"))}
          </div>
        </div>
      )}
    </div>
  );
}
