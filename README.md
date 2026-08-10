# website-lazisnu

Website identitas **LAZISNU MWC NU Kecamatan Paninggaran** — Inkremen 1 dari PRD-001, dibangun dalam sistem tata kelola [SDLC-HOTL](https://github.com/bagus01darmawan-wq/sdlc-hotl) (repo tata kelola, publik).

**Status:** Fase B0 selesai — menunggu QA-agent memasang kode tes pertama (failing-first, MERAH dulu). Lihat [HANTAR-KE-QA.md](HANTAR-KE-QA.md). Pembangunan fitur menyusul bertahap (B1–B5, T2–T12).

## Prinsip repo ini

- **Kode murni.** Tidak ada data lembaga (rekening, QRIS, kontak, profil, legalitas) di sini — seluruh konten hidup di database dan dimasukkan lewat halaman admin (keputusan desain B6). Riwayat commit repo ini tidak akan pernah memuat data lembaga (aturan keras B).
- **CI adalah gerbang.** `main` hanya berubah lewat *pull request* dengan CI hijau. Pemindai rahasia (SEC-02) adalah syarat mutlak.

## Struktur

| Berkas | Fungsi |
|---|---|
| `index.html` | Beranda: identitas + panel angka dana + tombol donasi |
| `penyaluran.html` | Kabar penyaluran (dari database) |
| `donasi.html` | Kanal donasi + label transparan (dari database) |
| `tentang.html` | Profil, legalitas, pengurus, kontak (dari database) |
| `admin.html` | Halaman admin terkunci (login) |
| `css/style.css` | Gaya bersama |
| `js/app.js` | Perilaku kecil bersama |
| `scripts/build-check.js` | Pemeriksaan build (CI) |
| `.github/workflows/ci.yml` | CI: tes QA + pemindai rahasia + build |

## CI (`.github/workflows/ci.yml`)

| Job | Peran | Syarat |
|---|---|---|
| `tes-qa` | Menjalankan tes QA (ditulis QA-agent; saat B0 belum dipasang) | **Hijau = syarat merge** |
| `pemindai-rahasia` | Gitleaks: memindai kode + riwayat commit (SEC-02) | **Syarat mutlak** |
| `build` | Memastikan kerangka 5 halaman utuh | Wajib hijau |

## Menjalankan build lokal

```bash
npm run build
```

## Konten dari database (T5, keputusan desain B6)

Halaman Tentang diisi **generator** (`npm run generate`) yang membaca tabel `konten_halaman`
di Supabase (baca-saja via anon key + RLS) lalu menyuntikkan nilainya ke `tentang.html`.
Repo ini tidak pernah memuat data lembaga — konten hidup di database.

Konfigurasi generator (nilai tidak pernah di-commit):

| Variabel | Asal |
|---|---|
| `SUPABASE_URL` | Secret CI `SUPABASE_URL`; lokal: `.env` (gitignored) |
| `SUPABASE_ANON_KEY` | Secret CI `SUPABASE_ANON_KEY`; lokal: `.env` (gitignored) |

Alur lokal: `npm run generate && npm test` (generate akan menimpa `tentang.html` di
working tree dengan versi berisi konten — jangan pernah `git add` berkas hasil generate).
