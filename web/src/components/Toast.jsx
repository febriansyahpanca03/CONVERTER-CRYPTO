/* Notifikasi kecil non-blocking di bawah layar — tidak pernah menutupi */
/* converter atau tombol penting.                                       */
export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="psa-toast" role="status" aria-live="polite">
      <span aria-hidden="true">✓</span>
      {message}
    </div>
  );
}
