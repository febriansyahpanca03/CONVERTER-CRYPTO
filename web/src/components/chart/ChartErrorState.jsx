import { IconRefresh } from "../Icons.jsx";

export default function ChartErrorState({ height, message, onRetry }) {
  return (
    <div className="psa-chart-empty" style={{ height }} role="alert">
      <p>{message || "Data grafik belum berhasil dimuat. Coba lagi beberapa saat."}</p>
      <button className="psa-chart-retry" onClick={onRetry}>
        <IconRefresh size={14} />
        Coba lagi
      </button>
    </div>
  );
}
