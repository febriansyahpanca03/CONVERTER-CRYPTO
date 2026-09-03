# Papan kurs kripto — panduan pasang di VPS

Konverter antar kripto dan mata uang dengan input bahasa biasa. Dua bagian:

- `web/` — React + Vite, di-build jadi berkas statis yang disajikan Nginx
- `server/` — Node/Express kecil yang memegang API key dan mem-proxy CoinGecko

Model bahasa hanya dipakai untuk membaca kalimat jadi `{amount, from, to}`.
Perhitungannya dikerjakan kode biasa dengan angka mentah dari CoinGecko, supaya
tidak ada risiko angka karangan.

Diasumsikan Ubuntu 22.04 atau 24.04, login sebagai user yang punya sudo.

---

## 1. Siapkan server

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git curl ufw

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # harus v20.x atau lebih
```

Firewall — hanya SSH dan web yang dibuka. Port 8787 sengaja tidak dibuka
karena backend cuma mendengarkan di `127.0.0.1`, jadi tidak bisa dijangkau
dari luar sama sekali:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

## 2. Buat user khusus dan taruh kodenya

Menjalankan layanan sebagai `root` berarti satu celah di aplikasi jadi kendali
penuh atas server. Jangan.

```bash
sudo useradd -r -m -d /opt/konverter -s /usr/sbin/nologin konverter
sudo mkdir -p /opt/konverter /var/www/konverter
```

Kirim kodenya dari komputermu (jalankan di laptop, bukan di server):

```bash
rsync -av --exclude node_modules --exclude dist --exclude .env \
  ./konverter-kripto/ user@IP_SERVER:/tmp/konverter/
```

Lalu di server:

```bash
sudo rsync -a /tmp/konverter/ /opt/konverter/
sudo chown -R konverter:konverter /opt/konverter
```

## 3. Isi API key

```bash
sudo -u konverter cp /opt/konverter/server/.env.example /opt/konverter/server/.env
sudo -u konverter nano /opt/konverter/server/.env
sudo chmod 600 /opt/konverter/server/.env
```

Isi `GROQ_API_KEY` — daftar gratis di console.groq.com (tanpa kartu kredit),
menu API Keys → Create API Key. `COINGECKO_API_KEY` boleh dikosongkan —
tanpa key tetap jalan, hanya batas lajunya lebih ketat.

`chmod 600` penting: tanpa itu, user lain di server bisa membaca key-mu.

## 4. Pasang dependensi dan build

```bash
cd /opt/konverter/server && sudo -u konverter npm ci --omit=dev

cd /opt/konverter/web && sudo -u konverter npm ci && sudo -u konverter npm run build
sudo cp -r /opt/konverter/web/dist/* /var/www/konverter/
sudo chown -R www-data:www-data /var/www/konverter
```

## 5. Jalankan backend sebagai layanan

```bash
sudo cp /opt/konverter/deploy/konverter.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now konverter
sudo systemctl status konverter --no-pager
```

Cek dari dalam server:

```bash
curl -s http://127.0.0.1:8787/api/health     # {"ok":true}
```

## 6. Pasang Nginx

```bash
# Snippet header keamanan (CSP, X-Frame-Options, dll). Wajib disalin
# duluan — nginx.conf meng-include-nya, jadi tanpa ini nginx -t gagal.
sudo mkdir -p /etc/nginx/snippets
sudo cp /opt/konverter/deploy/nginx-security.conf /etc/nginx/snippets/konverter-security.conf

sudo cp /opt/konverter/deploy/nginx.conf /etc/nginx/sites-available/konverter
sudo nano /etc/nginx/sites-available/konverter   # ganti DOMAIN_KAMU
sudo ln -sf /etc/nginx/sites-available/konverter /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Kalau belum punya domain, isi `server_name _;` dan akses lewat IP.

**Catatan soal header keamanan.** `deploy/push.sh` menyalin ulang *isi*
snippet-nya tiap deploy, tapi sengaja **tidak** menimpa
`sites-available/konverter` — file itu berisi hal yang khusus per server
(`server_name`, dan sertifikat yang ditambahkan certbot). Jadi kedua baris
`include /etc/nginx/snippets/konverter-security.conf;` di dalamnya cukup
dipasang sekali di sini. Baris itu harus ada **dua**: satu di level
`server`, satu lagi di dalam `location /assets/` — di nginx, `add_header`
berhenti diwarisi begitu sebuah `location` punya `add_header` sendiri,
sehingga tanpa yang kedua semua aset kehilangan header keamanannya.

Cek dengan:

```bash
curl -sI http://IP_SERVER/ | grep -i x-frame-options   # harus DENY
```

## 7. HTTPS

Perlu domain yang sudah diarahkan ke IP server (A record).

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d domainmu.com -d www.domainmu.com
```

Certbot mengubah konfigurasi Nginx dan memasang perpanjangan otomatis sendiri.
Cek dengan `sudo certbot renew --dry-run`.

---

## Memperbarui setelah ganti kode

```bash
# dari laptop
rsync -av --exclude node_modules --exclude dist --exclude .env \
  ./konverter-kripto/ user@IP_SERVER:/tmp/konverter/

# di server
sudo rsync -a --exclude .env /tmp/konverter/ /opt/konverter/
sudo chown -R konverter:konverter /opt/konverter
cd /opt/konverter/web && sudo -u konverter npm run build
sudo cp -r dist/* /var/www/konverter/
sudo systemctl restart konverter
```

## Kalau ada yang salah

```bash
sudo journalctl -u konverter -f        # log backend, langsung terlihat
sudo tail -f /var/log/nginx/error.log  # log Nginx
sudo systemctl status konverter
```

Gejala umum:

- **Halaman muncul tapi konversi gagal** — backend mati atau key salah.
  Lihat `journalctl`. Kalau tertulis `groq 401`, key-nya tidak valid.
- **502 Bad Gateway** — Nginx hidup, backend tidak. `systemctl start konverter`.
- **Selalu "Terlalu banyak permintaan"** — batas laju kena. Longgarkan
  `MAX_PER_WINDOW` di `server/index.js`, atau tambahkan CoinGecko API key.

## Pengembangan lokal

Dua terminal:

```bash
cd server && cp .env.example .env && npm install && npm run dev
cd web && npm install && npm run dev     # buka http://localhost:5173
```

Vite mem-proxy `/api` ke `localhost:8787`, jadi perilakunya sama seperti di
produksi.

## Catatan biaya

Parser kalimat pakai Groq (model Llama 3.1 8B), yang punya jatah gratis
harian tanpa perlu kartu kredit — cukup untuk pemakaian pribadi/skala kecil.
Batas laju 20 permintaan per menit per IP tetap ada supaya satu skrip iseng
tidak menghabiskan jatah gratismu — kalau situsnya publik, jangan dinaikkan
tanpa alasan. Kalau suatu saat jatah gratis Groq berubah, cek limit terbaru
di console.groq.com.
