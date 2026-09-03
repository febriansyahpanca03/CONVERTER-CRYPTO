import { useEffect, useRef } from "react";

/* Posisi bintang twinkle — statis (bukan Math.random() tiap render)      */
/* supaya nggak "meloncat" tiap hot-reload/re-render. Cuma sebagian kecil */
/* dari seluruh bintang yang kedap-kedip (lihat CSS psa-star-twinkle),    */
/* sisanya (far/near starfield) cuma drift pelan lewat background-image.  */
const TWINKLE_STARS = [
  { left: "8%", top: "14%", delay: "0.2s", duration: "4.2s" },
  { left: "18%", top: "62%", delay: "1.8s", duration: "5.6s" },
  { left: "27%", top: "31%", delay: "3.1s", duration: "3.4s" },
  { left: "36%", top: "82%", delay: "0.9s", duration: "6.1s" },
  { left: "44%", top: "9%", delay: "2.4s", duration: "4.8s" },
  { left: "52%", top: "48%", delay: "4.2s", duration: "3.9s" },
  { left: "61%", top: "71%", delay: "1.1s", duration: "5.2s" },
  { left: "69%", top: "22%", delay: "3.6s", duration: "4.5s" },
  { left: "77%", top: "58%", delay: "0.5s", duration: "6.4s" },
  { left: "85%", top: "36%", delay: "2.9s", duration: "3.6s" },
  { left: "91%", top: "78%", delay: "1.5s", duration: "5.9s" },
  { left: "14%", top: "90%", delay: "3.9s", duration: "4.1s" },
  { left: "58%", top: "88%", delay: "0.8s", duration: "5.4s" },
  { left: "95%", top: "12%", delay: "2.1s", duration: "3.8s" },
];

/* Live wallpaper luar angkasa, berlapis biar ada kedalaman (nebula, far  */
/* stars, near stars, twinkle, shooting star sesekali) — tapi tetap      */
/* sekunder: seluruh layer pointer-events:none dan redup di belakang     */
/* scrim, converter tidak pernah kalah fokus. Cuma foto & drift-nya yang */
/* "hidup"; rotasi lama (psa-star-spin) diganti drift diagonal yang      */
/* kerasa lebih natural daripada seluruh langit berputar di titik pusat. */
export default function Starfield() {
  const bgRef = useRef(null);

  useEffect(() => {
    const el = bgRef.current;
    if (!el) return undefined;

    // Parallax kursor: opsional & sangat kecil, dimatikan total di touch
    // device / reduced-motion / mobile — bukan cuma "diperkecil", supaya
    // nggak ada listener nganggur yang jalan sia-sia di perangkat yang
    // memang tidak akan memakainya.
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia?.("(pointer: coarse)").matches;
    const isNarrow = window.matchMedia?.("(max-width: 900px)").matches;
    const parallaxEnabled = !reduceMotion && !isTouch && !isNarrow;

    let raf = null;
    function onPointerMove(e) {
      if (raf) return; // satu update per frame, bukan per event mousemove
      raf = requestAnimationFrame(() => {
        const px = e.clientX / window.innerWidth - 0.5; // -0.5..0.5
        const py = e.clientY / window.innerHeight - 0.5;
        el.style.setProperty("--px", px.toFixed(3));
        el.style.setProperty("--py", py.toFixed(3));
        raf = null;
      });
    }
    if (parallaxEnabled) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    // Jangan jalankan animasi latar saat tab disembunyikan — nggak ada
    // yang lihat, cuma buang-buang CPU/baterai kalau tetap dianimasikan.
    function onVisibility() {
      el.classList.toggle("is-paused", document.hidden);
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (parallaxEnabled) window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="psa-bg" aria-hidden="true" ref={bgRef}>
      {/* 1: nebula (foto asli) */}
      <div className="psa-parallax-nebula">
        <div className="psa-bg-photo" />
      </div>
      {/* 2: far starfield */}
      <div className="psa-parallax-far">
        <div className="psa-stars-far" />
      </div>
      {/* 3: near starfield */}
      <div className="psa-parallax-near">
        <div className="psa-stars-near" />
      </div>
      {/* 4: subset kecil yang kedap-kedip */}
      {TWINKLE_STARS.map((s, i) => (
        <span
          key={i}
          className="psa-twinkle-star"
          style={{ left: s.left, top: s.top, animationDelay: s.delay, animationDuration: s.duration }}
        />
      ))}
      {/* 5: meteor sesekali, maksimal dua */}
      <div className="psa-shooting-star" />
      <div className="psa-shooting-star is-second" />
      {/* 6: scrim keterbacaan */}
      <div className="psa-bg-scrim" />
      {/* 7: focal glow di belakang converter */}
      <div className="psa-bg-focus" />
    </div>
  );
}
