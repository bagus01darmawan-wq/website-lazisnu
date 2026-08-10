# Tes QA — PRD-001 (website-lazisnu)

**Wilayah QA-agent.** Builder DILARANG mengubah isi folder `tests/` (aturan A surat tugas 07).

## Keputusan alat (kontrak pemasangan #4)

**Nol-dependensi:** harness murni Node standar (`tests/run-tes.js`) — dipilih agar repositori tetap "kode murni" tanpa `node_modules` dan CI tetap ringan. Wiring: `npm test` → `node tests/run-tes.js` (job `tes-qa` otomatis menyala).

Bila nanti sebuah tes butuh browser nyata (klik fisik), tambah alat khusus di folder tes dengan dokumentasi di sini — keputusan QA, dicatat.

## Gelombang pemasangan (registry lengkap rencana 05)

| Gelombang | Tes | Status |
|---|---|---|
| **G1 (terpasang)** | TQ-02, TQ-05, TQ-09a, TQ-10, TE-04(mesin) | aktif di `run-tes.js` |
| G2 (saat T6/RΛS tersedia) | TQ-03a, TQ-S1, TQ-S3, TE-01/02/03 | dijadwalkan — butuh database + auth |
| G3 (saat fitur/domain tiba) | TQ-04a, TQ-06, TQ-07(mesin), TQ-08, TQ-O4 | dijadwalkan — butuh konten DB, night mode, domain, prosedur downtime |
| Manual (di gerbang G2/G3) | TQ-01, TQ-03b, TQ-04b, TQ-06(ii), TQ-07(mata), TQ-09b, TQ-O1..O3 | lembar bukti HOTL |

## Merah dulu (aturan D)

Bukti MERAH-awal gelombang-1 dicatat di `catatan-merah-awal.md`. Beberapa tes memang hijau sejak kerangka B0 (TQ-02, TQ-05, TQ-10, TE-04) — itu sahih dan diakui (kerangka dibangun sebelum tes; bukan "tes basi"); TQ-09a adalah MERAH pertama yang jujur menunggu T5.
