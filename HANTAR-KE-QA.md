# HANTAR-KE-QA — Serah-terima Builder → QA-agent · PRD-001 Website LAZISNU

**Tanggal:** 2026-08-10 | **Penanda kesegaran:** baris "Versi" + tautan bukti B0 di bawah (komit f8a0082, CI run #31409291008)
**Dari:** builder (opencode, sesi B0) | **Untuk:** QA-agent (pemasang kode tes pertama)
**Putusan HOTL:** **GO** — lanjut ke fase HANTAR-KE-QA (keputusan 2026-08-10, sesi HOTL)

---

## 1. BAR

Kerangka 5 halaman + CI hidup (fase B0, T1). Per surat tugas 07: setelah B0 jalan, builder berhenti; **QA-agent memasang kode tes pertama (failing-first — MERAH dulu, dicatat), baru builder hijaukan bertahap (B1..B5).**

## 2. BUKTI B0 (masih segar, 2026-08-10)

- Repo publik: https://github.com/bagus01darmawan-wq/website-lazisnu (main, branch protection aktif: 3 check hijau + strict + enforce_admins)
- Komit awal: `f8a0082` — "B0: kerangka 5 halaman statis + CI (tes QA, pemindai rahasia SEC-02, build)"
- CI run #31409291008 → https://github.com/bagus01darmawan-wq/website-lazisnu/actions/runs/31409291008 — **Success 3/3** (tes-qa 8s · pemindai-rahasia 10s · build 13s), artifact `gitleaks-results.sarif` ada
- Build lokal: `npm run build` → "BUILD OK — 5 halaman kerangka utuh"
- Situs tersaji 7/7 URL lokal → HTTP 200 (index, penyaluran, donasi, tentang, admin, css, js)
- Folder kerja `D:\website-lazisnu`: 13 berkas, nol data lembaga (aturan B terpenuhi)

## 3. KONDISI REPO SAAT SERAH (yang Anda terima)

| Berkas | Isi |
|---|---|
| `index.html` | Beranda: `#angka-terkumpul`, `#angka-tersalurkan`, `#catatan-terakhir`, tombol → `donasi.html` |
| `penyaluran.html` | Kerangka daftar kabar (dari database, T7) |
| `donasi.html` | Kerangka: `#kanal-donasi`, `#label-transparan` (isi database T4/T8) |
| `tentang.html` | Kerangka profil/legalitas/pengurus/kontak (database T5) |
| `admin.html` | `#form-login` + `#wilayah-admin` (hidden; Supabase Auth T8, SEC-03) |
| `css/style.css`, `js/app.js` | Gaya + perilaku kecil bersama (tahun footer) |
| `scripts/build-check.js` | Pemeriksaan build (bukan tes QA — aturan A) |
| `.github/workflows/ci.yml` | Job `tes-qa` **mendeteksi otomatis** skrip `npm test` |

## 4. KONTRAK PEMASANGAN TES (untuk QA-agent)

1. **Lokasi tes bebas** (mis. `tests/`). Dilarang mengubah berkas implementasi (`index.html`, css, js, `scripts/build-check.js`, ci.yml) — itu wilayah builder (aturan A, dua arah).
2. **Wiring:** tambahkan `"test": "<perintah>"` di `package.json` → job `tes-qa` di CI menjalankan `npm test` otomatis (ci.yml baris 20–27; saat B0 belum ada skrip, job lulus kosong).
3. **Merah dulu (aturan D):** jalankan tes di lokal, catat MERAH awal (tanggal + waktu + output), lalu kirim lewat PR. Bukti merah bisa run CI di branch PR. Tanpa bukti merah, fase tidak tercatat.
4. **Kebutuhan runtime:** repo kini tanpa dependensi (package.json kosong dari node_modules). Jika tes butuh alat (mis. Playwright), tandai dalam berkas `tests/README`-nya atau gunakan alat Node standar — keputusan Anda, dokumentasikan.

## 5. PETA TES YANG BISA DIPASANG SEKARANG (kerangka statis)

| ID tes (rencana 05) | Inti uji | Keadaan kerangka B0 |
|---|---|---|
| TQ-02 | Dari beranda, halaman donasi ≤ 2 klik | Bisa hijau sekarang (tautan 1 klik) |
| TQ-05 | `#angka-terkumpul` & `#angka-tersalurkan` tampil di beranda | Elemen ada; isi angka database menyusul T9 — versi kerangka bisa hijau untuk keberadaan elemen |
| TQ-10 | 0 tautan rusak; 0 teks "lorem ipsum" | Bisa hijau sekarang |
| TQ-09a | Elemen halaman Tentang ada dan berisi | **Merah sekarang** (isi kosong sampai T5) — kandidat tes merah pertama yang jujur |
| TQ-S2 | Pemindai rahasia | Sudah hidup di CI (hijau) |
| TQ-03a/04a/06/07/08, TQ-S1/S3, TQ-O4 | Perlu database/domain/admin | Tulis skripnya sekarang atau saat fiturnya tiba — keputusan Anda; tiap tes wajib punya bukti merah lalu hijau di tahapnya |

## 6. YANG DIHARAPKAN KEMBALI DARI QA-AGENT

1. Tautan run CI **MERAH** (bukti failing-first) + ringkasan 3–5 kalimat.
2. Daftar tes yang terpasang (ID + metodenya) di berkas tes atau ringkasan PR.
→ Setelah itu builder (opencode) mulai fase **B1..B5**: T2 (layout+night mode) → T6 (skema+RLS) → T3/T4/T5 (halaman) → T7/T8/T9 (data+admin) → T10 (domain+https) → T12 (konten+latih admin), hijaukan tes bertahap.

## 7. ATURAN PENGINGAT (surat tugas 07)

- **A.** Builder dilarang mengubah berkas tes; QA-agent dilarang mengubah implementasi.
- **B.** Repo publik = kode murni; nol data lembaga di commit mana pun.
- **D.** Merah dulu sebelum hijau — bukti wajib.
- **E.** Setiap AC yang diklaim selesai wajib bukti tontonan yang bisa dinilai HOTL tanpa membaca kode.

```
TANDA TANGAN BUILDER (penutup fase B0) — kerangka 5 halaman + CI 3/3 hijau, siap menerima tes merah pertama.
Rantai niat: PRD-001 (G0) · Desain v1.3 (G1) · Tes v1.1 (ratifikasi) | Self-audit kartu: ✓ | Keberatan terbuka: tidak ada
```
