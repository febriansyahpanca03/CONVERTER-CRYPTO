import { useState } from "react";

/* Ikon token: pakai logo asli dari CoinGecko (via /api/icons) kalau ada, */
/* fallback ke monogram huruf depan kalau gagal/tidak tersedia (fiat).   */
export default function CoinIcon({ sym, size = 26, iconUrl }) {
  const [broken, setBroken] = useState(false);

  if (iconUrl && !broken) {
    return (
      <img
        src={iconUrl}
        alt=""
        width={size}
        height={size}
        className="psa-coin-icon"
        style={{ width: size, height: size, background: "none" }}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span className="psa-coin-icon" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {sym.slice(0, 1).toUpperCase()}
    </span>
  );
}
