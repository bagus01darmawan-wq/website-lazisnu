# website-lazisnu

Website identitas **LAZISNU MWC NU Kecamatan Paninggaran** — Inkremen 1 dari PRD-001, dibangun dalam sistem tata kelola [SDLC-HOTL](https://github.com/bagus01darmawan-wq/sdlc-hotl) (repo tata kelola, publik).

**Status:** Fase B0 (fondasi) — kerangka 5 halaman + CI hidup. Pembangunan fitur menyusul bertahap (T2–T12) setelah tes QA pertama dipasang.

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
