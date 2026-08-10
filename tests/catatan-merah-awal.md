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
