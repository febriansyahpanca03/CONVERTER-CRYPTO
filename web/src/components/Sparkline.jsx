/* Grafik mini 24 jam untuk kartu Pasangan Populer.

   SVG inline, tanpa library: bentuknya cuma satu polyline tanpa sumbu,
   tanpa label, dan tanpa interaksi — memuat lightweight-charts (173 KB)
   untuk ini jelas tidak sepadan, apalagi kartunya bisa ada 39 sekaligus.

   `points` WAJIB berisi harga asli dari CoinGecko. Kalau datanya tidak ada,
   pemanggilnya harus menampilkan skeleton — komponen ini tidak akan pernah
   mengarang garis pengganti. */
export default function Sparkline({ points, naik, width = 56, height = 20 }) {
  if (!Array.isArray(points) || points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const rentang = max - min;

  /* Harga yang datar sempurna (rentang 0) akan membuat pembagian jadi
     NaN — dalam kasus itu garisnya ditaruh di tengah kotak. */
  const y = (v) => {
    if (rentang === 0) return height / 2;
    // Disisakan 2px di atas & bawah supaya puncak garis tidak terpotong
    // oleh tepi SVG.
    return 2 + (1 - (v - min) / rentang) * (height - 4);
  };
  const x = (i) => (i / (points.length - 1)) * width;

  const d = points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
  const warna = naik ? "var(--success)" : "var(--danger)";

  return (
    <svg
      className="psa-sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      /* Murni dekoratif: perubahan persentase di sebelahnya sudah
         menyampaikan arah trennya dalam teks, lengkap dengan panah. */
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} stroke={warna} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
