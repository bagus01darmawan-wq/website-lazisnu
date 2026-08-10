// Pemeriksaan build — Fase B0/T1 (CI dasar).
// Memastikan kerangka 5 halaman statis utuh dan layak disajikan.
// BUKAN berkas tes: tes fitur/AC ditulis QA-agent (rencana tes 05) dan dilarang diubah builder (aturan A).
"use strict";

const fs = require("fs");
const path = require("path");

const PAGES = [
  "index.html",
  "penyaluran.html",
  "donasi.html",
  "tentang.html",
  "admin.html",
];

const root = path.join(__dirname, "..");
const errors = [];

for (const page of PAGES) {
  const file = path.join(root, page);
  if (!fs.existsSync(file)) {
    errors.push(`halaman hilang: ${page}`);
    continue;
  }
  const html = fs.readFileSync(file, "utf8");
  if (!/<html[\s>]/i.test(html)) {
    errors.push(`${page}: bukan dokumen HTML (tidak ada <html>)`);
  }
  if (!/<body[\s>]/i.test(html)) {
    errors.push(`${page}: tidak ada <body>`);
  }
}

if (errors.length > 0) {
  console.error("BUILD GAGAL:");
  for (const e of errors) {
    console.error("  - " + e);
  }
  process.exit(1);
}

console.log("BUILD OK — 5 halaman kerangka utuh: " + PAGES.join(", "));
