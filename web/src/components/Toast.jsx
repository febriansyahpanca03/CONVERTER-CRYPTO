import { IconCheck, IconInfo, IconClose } from "./Icons.jsx";

const TONE = {
  success: { title: "Berhasil", Icon: IconCheck, className: "psa-toast-success" },
  error: { title: "Gagal", Icon: IconInfo, className: "psa-toast-error" },
  info: { title: "Info", Icon: IconInfo, className: "psa-toast-info" },
};

/* Notifikasi kecil non-blocking, bertumpuk lewat .psa-toast-stack di    */
/* App.jsx (maksimal 3 sekaligus) — tidak pernah menutupi converter atau */
/* tombol bantuan karena posisinya di pojok atas, bukan tengah bawah.    */
export default function Toast({ text, tone = "success", onClose }) {
  const { title, Icon, className } = TONE[tone] || TONE.success;
  return (
    <div className={`psa-toast ${className}`} role="status">
      <span className="psa-toast-icon" aria-hidden="true">
        <Icon size={16} />
      </span>
      <span className="psa-toast-body">
        <span className="psa-toast-title">{title}</span>
        <span className="psa-toast-text">{text}</span>
      </span>
      <button className="psa-toast-close" onClick={onClose} aria-label="Tutup notifikasi">
        <IconClose size={14} />
      </button>
    </div>
  );
}
