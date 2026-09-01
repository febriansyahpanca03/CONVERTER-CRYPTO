import { useEffect, useRef, useState } from "react";
import { askAssistant } from "../lib/api.js";

const GREETING = {
  role: "assistant",
  text: "Halo! Aku asisten Panca Swap Agent 👋 Tanya aku cara pakai converter ini, atau ketik pertanyaanmu di bawah.",
};

/* Avatar maskot: pakai gambar kalau ada di /public/mascot.png,          */
/* fallback ke emoji kalau file belum ditaruh / gagal dimuat.            */
function Avatar({ size = 22, circle = true }) {
  const [broken, setBroken] = useState(false);
  if (broken) return <span aria-hidden="true" style={{ fontSize: size * 0.8 }}>🤖</span>;
  return (
    <img
      src="/mascot.png"
      alt=""
      width={size}
      height={size}
      style={circle ? { borderRadius: "50%", objectFit: "cover" } : { objectFit: "contain" }}
      onError={() => setBroken(true)}
    />
  );
}

/* Maskot bergerak: 86 potongan pose diambil otomatis dari sheet         */
/* referensi, disimpan sebagai file terpisah di /public/mascot/. Karena  */
/* tiap file berdiri sendiri (bukan satu sprite sheet), cukup gonta-ganti */
/* <img src> tiap ~130ms — tidak perlu tahu koordinat potongan pastinya. */
/* Frame-frame ini masih membawa sisa angka/label teks dari sheet asli */
/* yang nempel langsung ke gambar karakternya (tidak terpisah otomatis), */
/* jadi dikeluarkan dari daftar animasi.                                 */
const MASCOT_BAD_FRAMES = new Set([35, 53, 63, 64]);
const MASCOT_FRAMES = Array.from({ length: 86 }, (_, i) => i + 1)
  .filter((n) => !MASCOT_BAD_FRAMES.has(n))
  .map((n) => `/mascot/frame_${String(n).padStart(2, "0")}.png`);
const MASCOT_FRAME_COUNT = MASCOT_FRAMES.length;

function AnimatedMascot({ size = 76 }) {
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState(false);

  // Hangatkan cache browser di awal supaya putaran pertama juga mulus,
  // bukan cuma putaran kedua dan seterusnya.
  useEffect(() => {
    MASCOT_FRAMES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    if (broken) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % MASCOT_FRAME_COUNT), 130);
    return () => clearInterval(id);
  }, [broken]);

  if (broken) return <span aria-hidden="true" style={{ fontSize: size * 0.8 }}>🤖</span>;

  return (
    <img
      src={MASCOT_FRAMES[index]}
      alt=""
      width={size}
      height={size}
      draggable={false}
      style={{ objectFit: "contain" }}
      onError={() => setBroken(true)}
    />
  );
}

/* Maskot robot, sekarang jadi asisten AI beneran (bukan FAQ statis) —  */
/* pakai Groq yang sudah terhubung lewat /api/assistant, dengan prompt  */
/* yang dibatasi hanya menjawab seputar cara pakai situs ini.            */
export default function HelpBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const panelRef = useRef(null);
  const btnRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        !btnRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setSending(true);
    try {
      const reply = await askAssistant(text);
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: err.message || "Maaf, ada gangguan. Coba lagi sebentar lagi." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {open && (
        <div className="psa-help-panel" ref={panelRef} role="dialog" aria-label="Asisten Panca Swap Agent">
          <div className="psa-help-head">
            <Avatar size={26} />
            <div>
              <h3 style={{ margin: 0 }}>Asisten Panca Swap</h3>
              <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Siap bantu cara pakai situs ini</span>
            </div>
          </div>

          <div className="psa-help-messages" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`psa-help-msg psa-help-msg-${m.role}`}>
                {m.role === "assistant" && (
                  <span className="psa-help-msg-avatar">
                    <Avatar size={20} />
                  </span>
                )}
                <span className="psa-help-msg-bubble">{m.text}</span>
              </div>
            ))}
            {sending && (
              <div className="psa-help-msg psa-help-msg-assistant">
                <span className="psa-help-msg-avatar">
                  <Avatar size={20} />
                </span>
                <span className="psa-help-msg-bubble psa-help-typing" aria-label="Asisten sedang mengetik">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            )}
          </div>

          <div className="psa-help-input-row">
            <label htmlFor="psa-help-input" className="visually-hidden">
              Tanya asisten
            </label>
            <input
              id="psa-help-input"
              ref={inputRef}
              className="psa-help-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Tanya cara pakai converter…"
              disabled={sending}
            />
            <button
              className="psa-help-send"
              onClick={send}
              disabled={sending || !input.trim()}
              aria-label="Kirim pertanyaan"
              title="Kirim"
            >
              ➤
            </button>
          </div>
        </div>
      )}
      <div className={`psa-help-bot-track ${open ? "is-docked" : ""}`}>
        <button
          ref={btnRef}
          className="psa-help-bot"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Tutup asisten" : "Buka asisten bantuan"}
          title="Asisten bantuan"
        >
          <span className="psa-help-bot-bob">
            <AnimatedMascot size={76} />
          </span>
        </button>
      </div>
    </>
  );
}
