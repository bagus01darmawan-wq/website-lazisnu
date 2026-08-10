// Generator konten statis — Fase T5 (PRD-001, keputusan desain B6).
// Mengambil isi halaman dari database (tabel konten_halaman di schema `lazisnu`,
// baca-saja via anon key + RLS) lalu menyuntikkannya ke template tentang.html.
// Repo tetap KODE MURNI: tidak ada data lembaga di berkas yang di-commit —
// semuanya hidup di database.
//
// Keputusan mikro (dicatat): database dipakai bersama sumber pencatatan dana lembaga
// (putusan HOTL 2026-08-10) → semua tabel LAZISNU di schema terpisah `lazisnu`
// agar tabel/data proyek lain tidak tersentuh; pemilihan schema via header Accept-Profile.
//
// Konfigurasi: env SUPABASE_URL + SUPABASE_ANON_KEY, atau berkas .env lokal (gitignored).
// Gagal-tutup: bila database tak terjangkau atau konten belum lengkap, keluar non-nol
// (tidak pernah menulis halaman kosong diam-diam).
"use strict";

const fs = require("fs");
const path = require("path");

const SKEMA = "lazisnu";

function bacaEnv() {
  const env = { ...process.env };
  const file = path.join(__dirname, "..", ".env");
  if (fs.existsSync(file)) {
    for (const baris of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = baris.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

// Kunci konten_halaman yang disuntikkan ke halaman Tentang (peta skema desain G1).
const PEMETAAN = {
  tentang_profil: "{{tentang_profil}}",
  tentang_legalitas: "{{tentang_legalitas}}",
  tentang_pengurus: "{{tentang_pengurus}}",
  kontak_resmi: "{{kontak_resmi}}",
};

async function main() {
  const env = bacaEnv();
  const url = (env.SUPABASE_URL || "").replace(/\/+$/, "");
  const anon = env.SUPABASE_ANON_KEY || "";
  if (!url || !anon) {
    console.error("GAGAL: SUPABASE_URL / SUPABASE_ANON_KEY belum tersedia (env atau .env lokal).");
    process.exit(1);
  }

  const res = await fetch(`${url}/rest/v1/konten_halaman?select=kunci,nilai`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "Accept-Profile": SKEMA,
    },
  });
  if (!res.ok) {
    console.error(`GAGAL: database menolak permintaan baca (HTTP ${res.status}).`);
    process.exit(1);
  }
  const baris = await res.json();
  const konten = new Map(baris.map((b) => [b.kunci, b.nilai]));

  const fileTemplate = path.join(__dirname, "..", "tentang.html");
  let html = fs.readFileSync(fileTemplate, "utf8");

  const hilang = [];
  for (const [kunci, token] of Object.entries(PEMETAAN)) {
    const nilai = (konten.get(kunci) || "").trim();
    if (!nilai) hilang.push(kunci);
    html = html.split(token).join(nilai);
  }
  if (hilang.length > 0) {
    console.error(`GAGAL: konten database belum lengkap — kunci kosong: ${hilang.join(", ")}`);
    process.exit(1);
  }

  fs.writeFileSync(fileTemplate, html);
  console.log("KONTEN OK — tentang.html diperbarui dari database (4 kunci: tentang_profil, tentang_legalitas, tentang_pengurus, kontak_resmi).");
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
