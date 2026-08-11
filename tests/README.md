# Tes QA — PRD-001 (website-lazisnu)

**Wilayah QA-agent.** Builder DILARANG mengubah isi folder `tests/` (aturan A surat tugas 07).

## Keputusan alat (kontrak pemasangan #4)

**Nol-dependensi:** harness murni Node standar (`tests/run-tes.js` + `tests/gelombang-2.js`) — dipilih agar repositori tetap "kode murni" tanpa `node_modules` dan CI tetap ringan. Wiring: `npm test` → `node tests/run-tes.js` (job `tes-qa` otomatis menyala).

Bila nanti sebuah tes butuh browser nyata (klik fisik), tambah alat khusus di folder tes dengan dokumentasi di sini — keputusan QA, dicatat.

## Gelombang pemasangan (registry lengkap rencana 05)

| Gelombang | Tes | Status |
|---|---|---|
| **G1 (terpasang)** | TQ-02, TQ-05, TQ-09a, TQ-10, TE-04(mesin) | aktif di `run-tes.js` |
| **G2 (terpasang)** | TQ-03a, TQ-S1, TQ-S3, TE-01, TE-02, TE-03 | aktif di `gelombang-2.js` (dipanggil `run-tes.js`) — dipasang saat T6/RLS tersedia |
| G3 (saat fitur/domain tiba) | TQ-04a, TQ-06, TQ-07(mesin), TQ-08, TQ-O4 | dijadwalkan — butuh konten DB, night mode, domain, prosedur downtime |
| Manual (di gerbang G2/G3) | TQ-01, TQ-03b, TQ-04b, TQ-06(ii), TQ-07(mata), TQ-09b, TQ-O1..O3 | lembar bukti HOTL |

## Keputusan desain Gelombang-2 (dicatat QA)

1. **Cara tes berinteraksi:** server statis lokal (pola G1) + REST Supabase langsung via `fetch` bawaan Node — baca memakai anon key (RLS), tulis memakai token login admin (Supabase Auth password grant). Tanpa library tambahan.
2. **Kredensial admin (CI):** tes yang menulis data (TQ-03a, TE-02 bagian hidup, TE-03) membaca env `SUPABASE_ADMIN_EMAIL` + `SUPABASE_ADMIN_PASSWORD` (+ `SUPABASE_ADMIN2_EMAIL` + `SUPABASE_ADMIN2_PASSWORD` khusus TE-03). Bila env tidak ada → tes **SKIP berdokumentasi** (tidak merah, tidak hijau) — CI tidak tersumbat sebelum builder memasang secret. Setelah secret dipasang, tes menyala otomatis. Nama secret yang diminta ke builder: `SUPABASE_ADMIN_EMAIL`, `SUPABASE_ADMIN_PASSWORD`, `SUPABASE_ADMIN2_EMAIL`, `SUPABASE_ADMIN2_PASSWORD`.
3. **Lokal:** isi `tests/.env.qa` (gitignored via pola `.env.*`) dengan keempat variabel di atas, atau export di shell. `SUPABASE_URL`/`SUPABASE_ANON_KEY` diambil dari `.env` root (gitignored) atau env CI. **Urutan baca harness:** `process.env` → `.env` root → `tests/.env.qa` → `js/config.js` (fallback CI — ditulis step `npm run generate`, gitignored; workflow CI hanya memberi `SUPABASE_URL`/`SUPABASE_ANON_KEY` ke step generate, bukan ke step `npm test`).
4. **Disiplin TE-05 (pembersihan):** TQ-03a/TE-02 menurunkan baris kabar uji (`terbit=false`) di blok `finally` — selalu, juga saat langkah gagal — lalu memverifikasi baris tak lagi tampil publik. TE-03 mengembalikan angka ke nilai semula setelah uji. Catatan jujur: RLS kontrak F.2 **tidak memberi DELETE** (kabar/angka/konten: tulis-ubah saja; riwayat: append-only), jadi penghapusan fisik baris uji hanya bisa lewat akses SQL manajemen — dilakukan QA pada sesi pemasangan (lihat catatan-merah-awal.md); di CI baris kabar uji tersisa sebagai `terbit=false` (tak pernah tampil) dan entri riwayat uji tersisa sebagai jejak audit (by design B5). Ini temuan untuk amendemen rencana tes bila bar TE-05 ingin diperketat.
5. **Keterbatasan cakupan mesin (dicatat jujur):** TE-01 menguji pelindung level-aplikasi yang *dikirim* ke admin (validasi di `admin.js` + `min="1"` di `admin.html`) — database tidak punya check constraint nilai (hanya RLS siapa-yang-boleh, bukan berapa); uji klik form nyata = bagian manual/G3. TE-02 menguji kontrak layout (CSS pemenggalan kata, foto opsional & dibatasi, pemisahan halaman panel angka) + kabar hidup ber-emoji/panjang bulat-bulat lewat DB→API. TE-03 memverifikasi "tanpa error + nilai akhir penulis terakhir" lewat REST; isi riwayat_angka **tidak bisa dibaca lewat REST** (RLS F.2 sengaja tidak memberi SELECT — tabel audit internal B5), jadi verifikasi "kedua entri riwayat ada" dilakukan QA lewat akses SQL pada sesi pemasangan dan dicatat di catatan-merah-awal.md.
6. **TQ-S1 butuh query well-formed per tabel** (kolom yang benar per tabel) — percobaan malformed menghasilkan 400 (ditolak schema, bukan bukti RLS) dan dianggap gagal tes, bukan hijau. Pelajaran dari run pertama (lihat catatan-merah-awal.md).

## Merah dulu (aturan D)

Bukti MERAH-awal gelombang-1 dicatat di `catatan-merah-awal.md`; hasil gelombang-2 (termasuk 1 MERAH sahih internal pada run pertama: cacat probe TQ-S1 yang diperbaiki) di bagian Gelombang-2 berkas yang sama. Beberapa tes memang hijau sejak pemasangan (fitur sudah ada sebelum tes ditulis — pola G1, sahih dan diakui); TQ-09a sempat MERAH menunggu T5 lalu hijau.
