#!/usr/bin/env bash
# Deploy ke VPS. Dipakai supaya langkah-langkahnya tidak ditulis ulang
# manual tiap kali — perintah ad-hoc gampang lupa satu exclude penting.
#
#   ./deploy/push.sh [user@host]
#
set -euo pipefail

TARGET="${1:-ubuntu@43.163.124.182}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARBALL="$(mktemp -t konverter-deploy-XXXXXX).tar.gz"

cleanup() { rm -f "$TARBALL"; }
trap cleanup EXIT

echo "==> Mengemas dari $REPO_DIR"
# .env WAJIB dikecualikan: isinya GROQ_API_KEY dan COINGECKO_API_KEY, dan
# tarball-nya mendarat di /tmp server yang bisa dibaca user lain. Server
# sudah punya .env-nya sendiri yang tidak boleh ditimpa.
tar -czf "$TARBALL" -C "$REPO_DIR" \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='node_modules' \
  --exclude='web/dist' \
  .

echo "==> Isi tarball: $(du -h "$TARBALL" | cut -f1)"
if tar -tzf "$TARBALL" | grep -qE '(^|/)\.env$'; then
  echo "GAGAL: .env ikut terbungkus. Deploy dibatalkan." >&2
  exit 1
fi

echo "==> Mengirim ke $TARGET"
scp -o StrictHostKeyChecking=no "$TARBALL" "$TARGET:/tmp/konverter-deploy.tar.gz"

echo "==> Membangun & menyalakan ulang di server"
ssh -o StrictHostKeyChecking=no "$TARGET" 'bash -s' <<'REMOTE'
set -euo pipefail

sudo -u konverter bash -c '
  set -e
  cd /opt/konverter
  # tar --overwrite tidak menghapus file yang sudah dibuang dari repo,
  # jadi aset yang dihapus harus dibersihkan manual di sini.
  rm -rf /opt/konverter/web/public/mascot
  tar -xzf /tmp/konverter-deploy.tar.gz -C /opt/konverter --overwrite
  cd /opt/konverter/web
  npm install --no-audit --no-fund
  npm run build
'

# Snippet header keamanan — disalin tiap deploy supaya isinya selalu
# sinkron dengan yang ada di repo (dan dengan vercel.json).
sudo mkdir -p /etc/nginx/snippets
sudo cp /opt/konverter/deploy/nginx-security.conf /etc/nginx/snippets/konverter-security.conf
sudo nginx -t
sudo systemctl reload nginx

sudo rsync -a --delete /opt/konverter/web/dist/ /var/www/konverter/
sudo chown -R www-data:www-data /var/www/konverter
sudo systemctl restart konverter.service
sleep 1
sudo systemctl is-active konverter.service
rm -f /tmp/konverter-deploy.tar.gz
REMOTE

echo "==> Selesai"
