export default function ChartEmptyState({ height, message }) {
  return (
    <div className="psa-chart-empty" style={{ height }}>
      <p>{message || "Data historis untuk pasangan ini belum tersedia."}</p>
    </div>
  );
}
