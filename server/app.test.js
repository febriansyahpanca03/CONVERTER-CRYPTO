import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";

/* fetch di-mock supaya tes tidak pernah menyentuh CoinGecko sungguhan —
   selain lambat, itu juga akan memakan kuota API yang justru sedang
   kita jaga. Yang diuji di sini murni perilaku server: validasi
   parameter, cache, single-flight, dan penyajian data basi saat gagal. */
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

// app.js membaca env saat import, jadi diset sebelum modulnya dimuat.
process.env.GROQ_API_KEY = "test-key";

const { default: app } = await import("./app.js");

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const HARGA = {
  bitcoin: { usd: 77000, idr: 1_370_000_000, last_updated_at: 1700000000 },
};

describe("GET /api/price", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("menolak parameter kosong dengan 400", async () => {
    const res = await request(app).get("/api/price");
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menolak id yang tidak sesuai pola, bukan meneruskannya ke upstream", async () => {
    // Penjagaan injeksi: apa pun di luar [a-z0-9-] harus disaring habis
    // sebelum dirangkai jadi URL CoinGecko.
    const res = await request(app).get("/api/price?ids=../../etc/passwd&vs=usd");
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menolak vs_currency yang bukan tiga huruf", async () => {
    const res = await request(app).get("/api/price?ids=bitcoin&vs=dollars");
    expect(res.status).toBe(400);
  });

  it("mengambil dari upstream lalu menyajikan dari cache pada permintaan kedua", async () => {
    fetchMock.mockResolvedValue(jsonResponse(HARGA));

    const pertama = await request(app).get("/api/price?ids=bitcoin&vs=usd");
    expect(pertama.status).toBe(200);
    expect(pertama.headers["x-cache"]).toBe("miss");

    const kedua = await request(app).get("/api/price?ids=bitcoin&vs=usd");
    expect(kedua.headers["x-cache"]).toBe("hit");

    // Inti pengujiannya: upstream cuma dipanggil SEKALI untuk dua permintaan.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("menyamakan cache key walau urutan id/vs ditulis berbeda", async () => {
    fetchMock.mockResolvedValue(jsonResponse(HARGA));

    await request(app).get("/api/price?ids=ethereum,bitcoin&vs=idr,usd");
    const kedua = await request(app).get("/api/price?ids=bitcoin,ethereum&vs=usd,idr");

    expect(kedua.headers["x-cache"]).toBe("hit");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("single-flight: banyak permintaan bersamaan cuma memicu satu panggilan upstream", async () => {
    // Ini yang dulu jadi lubangnya: begitu cache kedaluwarsa, semua
    // permintaan yang masuk barengan sama-sama meleset dan sama-sama
    // menembak CoinGecko.
    //
    // Timer asli dipakai di tes ini: menunggu permintaan HTTP betulan
    // sampai ke handler butuh event loop yang berjalan normal, sedangkan
    // timer palsu justru membekukannya.
    vi.useRealTimers();

    let resolveUpstream;
    const upstreamDipanggil = new Promise((tandai) => {
      fetchMock.mockImplementation(() => {
        tandai();
        return new Promise((r) => {
          resolveUpstream = () => r(jsonResponse(HARGA));
        });
      });
    });

    // .then() penting di sini: objek dari supertest baru benar-benar
    // mengirim permintaannya saat di-then/await. Kalau cuma dikumpulkan
    // ke array tanpa itu, tidak ada satu pun yang jalan dan tesnya
    // menggantung menunggu upstream yang tak pernah dipanggil.
    const permintaan = [1, 2, 3].map(() =>
      request(app).get("/api/price?ids=solana&vs=usd").then((r) => r)
    );

    await upstreamDipanggil; // ketiganya sudah masuk, upstream baru jalan sekali
    resolveUpstream();

    const hasil = await Promise.all(permintaan);
    hasil.forEach((r) => expect(r.status).toBe(200));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("menyajikan data basi dari cache kalau upstream error, bukan gagal total", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(HARGA));
    await request(app).get("/api/price?ids=cardano&vs=usd");

    // Lewati TTL supaya cache-nya kedaluwarsa, lalu buat upstream gagal.
    vi.advanceTimersByTime(31_000);
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "rate limited" }, 429));

    const res = await request(app).get("/api/price?ids=cardano&vs=usd");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(HARGA);
  });

  it("mengembalikan 502 kalau upstream gagal dan belum ada apa pun di cache", async () => {
    fetchMock.mockRejectedValue(new Error("jaringan mati"));
    const res = await request(app).get("/api/price?ids=polkadot&vs=usd");
    expect(res.status).toBe(502);
  });
});

describe("GET /api/chart", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("menolak rentang hari di luar daftar yang diizinkan", async () => {
    const res = await request(app).get("/api/chart?id=bitcoin&vs=usd&days=999&type=line");
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menolak tipe grafik yang tidak dikenal", async () => {
    const res = await request(app).get("/api/chart?id=bitcoin&vs=usd&days=1&type=pie");
    expect(res.status).toBe(400);
  });

  it("memangkas market_chart hanya ke prices", async () => {
    // market_chart bawaan CoinGecko juga membawa market_caps & total_volumes
    // yang tidak dipakai chart — tidak perlu ikut dikirim ke browser.
    fetchMock.mockResolvedValue(
      jsonResponse({ prices: [[1, 2]], market_caps: [[1, 999]], total_volumes: [[1, 888]] })
    );
    const res = await request(app).get("/api/chart?id=bitcoin&vs=usd&days=1&type=line");
    expect(res.body).toEqual({ prices: [[1, 2]] });
    expect(res.body.market_caps).toBeUndefined();
  });
});

describe("GET /api/health", () => {
  it("membalas ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
