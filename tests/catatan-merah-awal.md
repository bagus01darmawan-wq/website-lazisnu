# Catatan MERAH-AWAL — Gelombang 1 (aturan D surat tugas 07)

**Tanggal & waktu:** 2026-08-10 (sesi QA) | **Perintah:** `npm test` | **Basis:** kerangka B0 (komit awal repo)

```
HIJAU  TQ-02   Beranda → donasi ≤ 2 klik (struktur tautan langsung)
        -> tautan langsung ke donasi.html ditemukan di beranda (1 klik)
HIJAU  TQ-05   Panel angka terkumpul & tersalurkan ada di beranda
        -> kedua elemen angka ada
MERAH  TQ-09a  Tentang: elemen profil/kontak/legalitas ADA dan BERISI (tag kosong = gagal)
        -> MERAH: profil≥50char=true, kontak berpola=false, legalitas terisi=false
           — kerangka B0 memang kosong (menunggu T5)
HIJAU  TQ-10   Nol tautan rusak + nol "lorem ipsum"
        -> bersih
HIJAU  TE-04   meta viewport ada di beranda (syarat rapi HP; uji visual menyusul)
        -> ada

Ringkasan: 4 hijau, 1 merah (gelombang-1 pada kerangka B0).
```

**Keterangan jujur:** TQ-02/TQ-05/TQ-10/TE-04 hijau sejak pemasangan karena kerangka B0 dibangun **sebelum** tes ada — diakui apa adanya (bukan "tes basi", lihat README). **TQ-09a adalah merah sahih pertama:** ia akan tetap merah sampai builder mengisi konten Tentang lewat jalur database (T5), lalu hijau — itulah rangkaian failing-first yang diawasi.

---

# Catatan MERAH-AWAL — Gelombang 2 (aturan D surat tugas 07)

**Tanggal & waktu:** 2026-08-11, ±09:20 WIB (sesi QA) | **Perintah:** `npm run generate && npm test` | **Basis:** main @ 81803a7 (T6/RLS + T7–T10 sudah hidup)

## Run pertama (2026-08-11, ±09:15 WIB) — ditemukan 1 MERAH sahih

```
MERAH  TQ-S1   Tanpa login: tulis/ubah/hapus 4 tabel SEMUA ditolak (SEC-01)
        -> MERAH: percobaan yang TIDAK ditolak -> angka_dana:PATCH=400,
           kabar_penyaluran:PATCH=400, riwayat_angka:PATCH=400,
           konten_halaman:PATCH=400, konten_halaman:DELETE=400
```

**Analisis jujur (cacat probe QA, bukan celah keamanan):** 400 = permintaan malformed, bukan penolakan RLS — probe PATCH mengirim kolom `nilai` ke tabel yang tidak punya kolom itu, dan DELETE `konten_halaman` memakai filter `id` padahal kunci utamanya `kunci` (teks). Permintaan ditolak schema, bukan oleh kebijakan keamanan → **tidak sah dihitung sebagai bukti SEC-01**. Perbaikan: probe per tabel memakai kolom/filter yang benar (`angka_dana`, `kabar_penyaluran`, `riwayat_angka` → `id`; `konten_halaman` → `kunci`). Pelajaran dicatat di README (keputusan #6).

## Run final (2026-08-11, ±09:25 WIB) — setelah perbaikan probe

```
HIJAU  TQ-02   Beranda → donasi ≤ 2 klik (struktur tautan langsung)
        -> tautan langsung ke donasi.html ditemukan di beranda (1 klik)
HIJAU  TQ-05   Panel angka terkumpul & tersalurkan ada di beranda
        -> kedua elemen angka ada
HIJAU  TQ-09a  Tentang: elemen profil/kontak/legalitas ADA dan BERISI (tag kosong = gagal)
        -> profil/kontak/legalitas ada dan berisi
HIJAU  TQ-10   Nol tautan rusak + nol "lorem ipsum"
        -> bersih
HIJAU  TE-04   meta viewport ada di beranda (syarat rapi HP; uji visual menyusul)
        -> ada
HIJAU  TQ-03a  Kabar contoh masuk DB -> tampil di halaman penyaluran (E2E pendukung)
        -> HIJAU: kabar "[UJI QA TQ-03a] 1786415011581" terbit -> API publik mengembalikan
           judul+tanggal+ringkasan utuh; halaman penyaluran ter-wiring (#daftar-kabar +
           data.js kueri terbit=true) | TE-05: baris uji diturunkan (terbit=false), tak lagi tampil publik
HIJAU  TQ-S1   Tanpa login: tulis/ubah/hapus 4 tabel SEMUA ditolak (SEC-01)
        -> HIJAU: 12 percobaan anon (POST/PATCH/DELETE x 4 tabel) ditolak 401/403
           + riwayat_angka tak terbaca publik (SELECT tertolak)
HIJAU  TQ-S3   Halaman admin tanpa login tertolak; login sandi salah ditolak (SEC-03)
        -> HIJAU: tanpa login — form masuk tampil, wilayah admin tersembunyi (hidden) dan
           4 form isi di dalamnya tak terjangkau; sandi salah -> HTTP 400 tanpa token
HIJAU  TE-01   Angka negatif/nol/raksasa ditolak dengan pesan jelas (kasus tepi)
        -> HIJAU: guard aplikasi ada — validasiAngka (nol/negatif: "Angka harus lebih dari 0.";
           raksasa: batas 100 triliun + "Angka terlalu besar") + input number min=1
HIJAU  TE-02   Kabar tanpa foto / teks sangat panjang / emoji & aksara non-latin tidak merusak layout (kasus tepi)
        -> HIJAU: inti layout aman (pemenggalan=true, fotoAman=true, panelTerpisah=true,
           fotoOpsional=true) + kabar ber-emoji/non-latin/panjang/tanpa-foto bulat-bulat lewat DB->API
HIJAU  TE-03   Dua admin simpan bersamaan <10 detik: tanpa error, kedua entri riwayat ada (kasus tepi)
        -> HIJAU: dua admin meluncurkan simpan dengan selang 0 ms (<10 dtk; total lintasan 388 ms):
           PATCH×2 & riwayat×2 semuanya diterima (204/201, 204/201), tanpa error; nilai akhir =
           salah satu penulis (last-writer-wins, akhir=admin2); nilai dikembalikan ke semula (TE-05)

Ringkasan: 11 hijau, 0 merah, 0 skip (G1+G2).
```

## Run verifikasi lanjutan (2026-08-11, ±09:33 WIB — sesi QA lanjutan, setelah perbaikan kebocoran kredensial)

Konteks: commit pertama G2 (`1f329c3`) bocor email admin + pola `password:` nyata ke riwayat → gitleaks MERAH. Perbaikan: (a) probe sandi salah memakai email palsu `bukan-admin-uji@contoh.test` + sandi uji palsu — penolakan login terbukti tanpa kredensial asli; (b) bukti SQL di-redaksi (`admin-1`/`admin-2`); (c) fallback env `js/config.js` ditambahkan ke harness (urutan baca: `process.env` → `.env` → `tests/.env.qa` → `js/config.js`) karena workflow CI (wilayah builder) memberi `SUPABASE_URL`/`SUPABASE_ANON_KEY` hanya ke step `generate`. Riwayat cabang ditulis ulang menjadi satu commit bersih (lihat laporan QA).

```
HIJAU  TQ-02   Beranda → donasi ≤ 2 klik          HIJAU  TQ-05   Panel angka di beranda
HIJAU  TQ-09a  Tentang berisi (konten DB)         HIJAU  TQ-10   Nol tautan rusak, nol lorem
HIJAU  TE-04   meta viewport                      HIJAU  TQ-03a  Kabar contoh → API publik utuh + wiring (TE-05: terbit=false)
HIJAU  TQ-S1   12/12 percobaan anon ditolak 401/403 + riwayat tak terbaca publik
HIJAU  TQ-S3   Admin terkunci tanpa login; sandi salah → HTTP 400 tanpa token
HIJAU  TE-01   Guard angka (nol/negatif/raksasa) + min=1
HIJAU  TE-02   Layout aman (pemenggalan, foto opsional) + kabar hidup lewat DB→API
HIJAU  TE-03   Dua admin simpan selang 0 ms, PATCH×2 & riwayat×2 diterima, last-writer-wins, nilai dipulihkan

Ringkasan run penuh (kredensial lokal tests/.env.qa): 11 hijau, 0 merah, 0 skip — exit 0.
Simulasi CI (tanpa .env & tanpa tests/.env.qa, hanya js/config.js hasil generate):
  9 hijau, 0 merah, 2 skip (TQ-03a, TE-03; TE-02 bagian inti) — exit 0.
Build: `npm run build` → BUILD OK — 5 halaman kerangka utuh.
```

- **Verifikasi ulang setelah temuan gitleaks lokal (gitleaks 8.24.3, config default):** pola `password: "…"` dengan nilai 18 char berentropi tinggi (3,54) ternyata masih di-flag rule `generic-api-key` → probe diganti sandi palsu berentropi rendah `"sandi salah"` (ada spasi, di bawah ambang rule; tetap ≥6 char sehingga ditolak karena kredensial salah, bukan panjang). Hasil: gitleaks pada `tests/` = 0 finding (satu-satunya finding = `tests/.env.qa`, gitignored); `npm run generate && npm test` → 11 hijau, 0 merah, 0 skip lagi; TQ-S3 tetap HIJAU (sandi salah → HTTP 400 tanpa token).
- **Pembersihan TE-05 (sesi ini):** baris kabar uji `[UJI QA TQ-03a]` (id 6) dan riwayat uji TE-03 (id 9–11) dihapus via SQL manajemen. Keadaan akhir: `kabar_penyaluran` = 1 baris nyata (terbit), `riwayat_angka` = 1 baris nyata (id 2, entri awal 2.500.000), `angka_dana` id 3 = periode 2026, 2.500.000/2.500.000, aktif — **persis keadaan sebelum sesi**.

## Bukti verifikasi SQL (akses manajemen, sesi QA — bukan jalur REST)

- **TE-03 — kedua entri riwayat ada, berurutan, berstempel waktu** (query `lazisnu.riwayat_angka` setelah run):
  - id 6 — admin-1 — 2.500.000 → 2.500.001 — `2026-08-11 02:23:35.522+00`
  - id 7 — admin-2 — 2.500.000 → 2.500.002 — `2026-08-11 02:23:35.733+00` (keduanya membaca lama yang sama = simpan bersamaan)
  - id 8 — pemulihan TE-05 — 2.500.002 → 2.500.000 — `2026-08-11 02:23:35.923+00`
- **Pembersihan TE-05:** baris kabar uji `[UJI QA TQ-03a]` (id 4–5) dan riwayat uji (id 3–8) dihapus via SQL manajemen. Keadaan akhir: `kabar_penyaluran` = 1 baris nyata (terbit), `riwayat_angka` = 1 baris nyata (id 2, entri awal angka 2.500.000), `angka_dana` id 3 = periode 2026, 2.500.000/2.500.000, aktif — **persis keadaan sebelum sesi**.
- **Simulasi CI tanpa kredensial admin:** `npm test` → 9 hijau, 0 merah, 2 skip (TQ-03a, TE-03; TE-02 hanya bagian inti) — exit 0. Tes login-admin menyala otomatis setelah secret `SUPABASE_ADMIN_EMAIL/PASSWORD` + `SUPABASE_ADMIN2_EMAIL/PASSWORD` dipasang builder.
- **Build:** `npm run build` → `BUILD OK — 5 halaman kerangka utuh`.

**Keterangan jujur:** semua tes G2 hijau sejak pemasangan karena fitur (T6 RLS, T7 kabar, T8 admin, T9 angka) dibangun **sebelum** tes G2 ditulis — diakui apa adanya (pola G1). Satu-satunya MERAH pada run pertama adalah cacat probe internal QA (TQ-S1), bukan cacat produk; produk memang memenuhi kontrak RLS F.2 (terbukti: 12/12 percobaan anon ditolak 401, riwayat tak terbaca publik).
