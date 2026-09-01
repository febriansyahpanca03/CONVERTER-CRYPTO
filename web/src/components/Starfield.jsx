/* Live wallpaper: foto galaksi asli (NASA/Hubble, domain publik),      */
/* diperhalus dengan blur + overlay gelap supaya teks & kartu tetap     */
/* mudah dibaca. Cuma titik bintang yang berputar pelan — foto sendiri  */
/* statis, tidak mengganggu perhatian ke converter.                    */
export default function Starfield() {
  return (
    <div className="psa-bg" aria-hidden="true">
      <div className="psa-bg-photo" />
      <div className="psa-bg-scrim" />
      <div className="psa-bg-stars" />
    </div>
  );
}
