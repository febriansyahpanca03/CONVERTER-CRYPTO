/* Tinggi skeleton harus sama persis dengan tinggi chart aslinya supaya  */
/* layout tidak "loncat" begitu data selesai dimuat.                     */
export default function ChartLoadingState({ height }) {
  return (
    <div className="psa-chart-skeleton" style={{ height }} role="status">
      <div className="psa-chart-skeleton-bar" />
      <span className="visually-hidden">Memuat data harga…</span>
    </div>
  );
}
