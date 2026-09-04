import { useId } from "react";

/* Sistem tooltip terpusat — dipakai di seluruh situs (info Quick Command,
   Salin, Swap, status Live, waktu pembaruan, periode chart, Perbesar
   chart, tombol bantuan) supaya perilakunya konsisten, bukan campuran
   `title` bawaan browser di sana-sini.

   Murni CSS, tanpa JS positioning: bubble-nya anak dari elemen yang sama,
   ditampilkan lewat `:hover` DAN `:focus-within` (jadi otomatis bisa
   dipicu keyboard — men-tab ke tombolnya sudah cukup, tidak perlu
   listener terpisah). transition-delay memberi jeda singkat sebelum
   muncul, meniru delay tooltip native tanpa setTimeout.

   `role="tooltip"` + `aria-describedby` di elemen pemicu: pembaca layar
   akan membacakan teksnya saat elemen pemicu difokus, sama seperti judul
   native, tapi dengan kontrol penuh atas tampilannya. */
export default function Tooltip({ children, label, side = "top" }) {
  const id = useId();
  return (
    <span className={`psa-tt psa-tt-${side}`}>
      {/* cloneElement dihindari sengaja — pemicunya harus definisikan
          sendiri aria-describedby-nya lewat prop `tooltipId` di bawah,
          supaya tidak ada elemen anak tunggal yang dipaksakan. */}
      {typeof children === "function" ? children(id) : children}
      <span className="psa-tt-bubble" role="tooltip" id={id}>
        {label}
      </span>
    </span>
  );
}
