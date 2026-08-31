// Entry point serverless untuk Vercel. Vercel memanggil ulang fungsi ini
// per-request, jadi TIDAK ada app.listen() di sini — cukup ekspor app-nya,
// runtime Node Vercel yang menangani siklus request/response.
import app from "../server/app.js";

export default app;
