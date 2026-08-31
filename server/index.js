import app from "./app.js";

const PORT = process.env.PORT || 8787;

if (!process.env.GROQ_API_KEY) {
  console.error("GROQ_API_KEY belum diisi. Lihat .env.example.");
  process.exit(1);
}

app.listen(PORT, "127.0.0.1", () =>
  console.log(`konverter-kripto siap di 127.0.0.1:${PORT}`)
);
