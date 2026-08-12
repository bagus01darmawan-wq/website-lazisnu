#!/usr/bin/env bash
# Deploy website LAZISNU ke VM (T10) — pipeline yang bisa diulang.
# =============================================================================
# Prasyarat:
#   - SSH alias "lazisnu" terkonfigurasi (HostName 43.128.98.52, User ubuntu, key)
#   - .env lokal berisi SUPABASE_URL + SUPABASE_ANON_KEY (gitignored)
#   - Di VM: container nginx "lazisnu-nginx-1" dengan vhost png.lazisnu.site
#     (root /usr/share/nginx/lazisnu — lihat catatan T10 di README)
#
# Alur: generate konten dari database -> kemas berkas statis -> kirim ke VM ->
#       salin ke dalam container nginx -> pulihkan template lokal (repo tetap bersih).
#
# ROLLBACK: kembalikan versi sebelumnya lalu jalankan skrip ini lagi:
#   git checkout <rev-sebelumnya> -- index.html penyaluran.html donasi.html tentang.html admin.html css js scripts
#   ./scripts/deploy-vm.sh
# (versi lama ikut terkirim; tidak ada state di server selain berkas statis.)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> 1/6 Generate konten dari database (npm run generate)"
npm run generate

echo "==> 2/6 Siapkan paket statis"
PAKET="$(mktemp -d)"
mkdir -p "$PAKET/css" "$PAKET/js"
cp index.html penyaluran.html donasi.html tentang.html admin.html "$PAKET/"
cp css/style.css "$PAKET/css/"
# Daftar JS EKSPLISIT — berkas baru WAJIB ditambahkan di sini (pelajaran 2026-08-12:
# pulihkan-sandi.js sempat tidak ter-deploy karena tidak ada di daftar → 404 live).
cp js/config.js js/data.js js/admin.js js/app.js js/pulihkan-sandi.js "$PAKET/js/"
tar czf /tmp/lazisnu-site.tar.gz -C "$PAKET" .

echo "==> 3/6 Kirim ke VM (ssh lazisnu)"
scp -q /tmp/lazisnu-site.tar.gz lazisnu:/tmp/

echo "==> 4/6 Salin ke dalam container nginx"
ssh lazisnu 'set -e
  rm -rf /tmp/site-extract && mkdir -p /tmp/site-extract
  tar xzf /tmp/lazisnu-site.tar.gz -C /tmp/site-extract
  docker exec lazisnu-nginx-1 mkdir -p /usr/share/nginx/lazisnu
  docker cp /tmp/site-extract/. lazisnu-nginx-1:/usr/share/nginx/lazisnu/
  rm -rf /tmp/site-extract /tmp/lazisnu-site.tar.gz
  echo "   terkirim ke dalam container"'

echo "==> 5/6 Pulihkan template lokal (repo tetap kode murni)"
git checkout -- index.html penyaluran.html donasi.html tentang.html admin.html 2>/dev/null || true

rm -rf "$PAKET" /tmp/lazisnu-site.tar.gz
echo "==> 6/6 Selesai. Cek: https://png.lazisnu.site"
