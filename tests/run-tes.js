// tests/run-tes.js — Harness tes QA nol-dependensi (Node standar saja).
// QA-agent · PRD-001 · Gelombang-1 (terpasang ke kerangka statis).
// Aturan: skrip ini dan seluruh tests/ adalah wilayah QA; builder DILARANG mengubahnya (aturan A).
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
      const file = path.join(root, urlPath);
      if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404); res.end('404'); return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'text/plain' });
      res.end(fs.readFileSync(file));
    });
    srv.listen(0, () => resolve(srv));
  });
}

const hasil = [];
const catat = (id, untuk, lulus, catatan) => hasil.push({ id, untuk, lulus, catatan });

(async () => {
  const srv = await serve();
  const port = srv.address().port;
  const ambil = async (p) => {
    const r = await fetch(`http://localhost:${port}${p}`);
    return { status: r.status, teks: await r.text() };
  };

  // --- TQ-02 (AC-02): beranda → donasi ≤ 2 klik
  {
    const { teks } = await ambil('/index.html');
    const tautanLangsung = /<a[^>]+href=["']donasi\.html["']/i.test(teks);
    catat('TQ-02', 'Beranda → donasi ≤ 2 klik (struktur tautan langsung)', tautanLangsung,
      tautanLangsung ? 'tautan langsung ke donasi.html ditemukan di beranda (1 klik)' : 'TIDAK ada tautan langsung ke donasi.html di beranda');
  }

  // --- TQ-05 (AC-05): dua panel angka ADA di beranda (isi dari database = fase T9)
  {
    const { teks } = await ambil('/index.html');
    const ada = /id=["']angka-terkumpul["']/i.test(teks) && /id=["']angka-tersalurkan["']/i.test(teks);
    catat('TQ-05', 'Panel angka terkumpul & tersalurkan ada di beranda', ada,
      ada ? 'kedua elemen angka ada' : 'elemen angka tidak lengkap di beranda');
  }

  // --- TQ-09a (AC-09): halaman Tentang — elemen ada DAN berisi (tag kosong = GAGAL)
  {
    const { teks } = await ambil('/tentang.html');
    const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const badan = strip(teks);
    const cekProfil = badan.length >= 50;
    const cekKontak = /(\+?\d{9,}|@)/.test(badan);
    const cekLegalitas = /legalitas/i.test(badan) && /(proses|belum|SK|nomor)/i.test(badan) && badan.replace(/legalitas/gi, '').length > 30;
    const lulus = cekProfil && cekKontak && cekLegalitas;
    catat('TQ-09a', 'Tentang: elemen profil/kontak/legalitas ADA dan BERISI (tag kosong = gagal)', lulus,
      lulus ? 'profil/kontak/legalitas ada dan berisi'
        : `MERAH: profil≥50char=${cekProfil}, kontak berpola=${cekKontak}, legalitas terisi=${cekLegalitas} — kerangka B0 memang kosong (menunggu T5)`);
  }

  // --- TQ-10 (AC-10): 0 tautan rusak + 0 "lorem ipsum"
  {
    const halaman = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
    let rusak = [], lorem = [];
    for (const h of halaman) {
      const src = fs.readFileSync(path.join(root, h), 'utf8');
      if (/lorem ipsum/i.test(src)) lorem.push(h);
      const refs = [...src.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map((m) => m[1])
        .filter((r) => !r.startsWith('http') && !r.startsWith('#') && !r.startsWith('mailto:') && !r.startsWith('tel:'));
      for (const r of refs) if (!fs.existsSync(path.join(root, r.split('#')[0]))) rusak.push(`${h} -> ${r}`);
    }
    const lulus = rusak.length === 0 && lorem.length === 0;
    catat('TQ-10', 'Nol tautan rusak + nol "lorem ipsum"', lulus,
      lulus ? 'bersih' : `MERAH: tautan rusak=${JSON.stringify(rusak)}; lorem=${JSON.stringify(lorem)}`);
  }

  // --- TE-04 (mesin-pendukung): meta viewport ada (syarat rapi di HP)
  {
    const { teks } = await ambil('/index.html');
    const ada = /<meta[^>]+name=["']viewport["']/i.test(teks);
    catat('TE-04', 'meta viewport ada di beranda (syarat rapi HP; uji visual menyusul)', ada, ada ? 'ada' : 'MERAH: meta viewport hilang');
  }

  srv.close();
  // --- Laporan
  let merah = 0;
  for (const h of hasil) {
    if (!h.lulus) merah++;
    console.log(`${h.lulus ? 'HIJAU' : 'MERAH'}  ${h.id.padEnd(7)} ${h.untuk}\n        -> ${h.catatan}`);
  }
  console.log(`\nRingkasan: ${hasil.length - merah} hijau, ${merah} merah (gelombang-1 pada kerangka B0).`);
  if (merah > 0) process.exit(1);
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
