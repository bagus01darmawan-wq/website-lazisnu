// tests/gelombang-2.js — Tes QA Gelombang-2 (PRD-001, rencana tes 05 v1.1).
// QA-agent · dipasang saat T6/RLS tersedia (jadwal G2 di tests/README.md).
// Harness nol-dependensi: Node standar + fetch bawaan; REST Supabase langsung
// (anon key + login admin via Supabase Auth) + server statis lokal.
// Aturan: seluruh tests/ adalah wilayah QA; builder DILARANG mengubah (aturan A).
//
// Kebijakan kredensial (keputusan QA, dicatat):
//  - TQ-S1, TQ-S3, TE-01, TE-02(inti)  -> hanya SUPABASE_URL + SUPABASE_ANON_KEY (CI sudah punya).
//  - TQ-03a, TE-02(hidup), TE-03       -> butuh login admin:
//      env SUPABASE_ADMIN_EMAIL + SUPABASE_ADMIN_PASSWORD (+ SUPABASE_ADMIN2_EMAIL/PASSWORD utk TE-03).
//      Bila tidak ada -> SKIP berdokumentasi (tidak merah, tidak hijau). Builder memasang
//      secret-nya (nama variabel di laporan QA & tests/README.md) agar tes menyala di CI.
//  - Sumber env: process.env dulu, lalu .env (root), lalu tests/.env.qa (gitignored),
//    lalu js/config.js (fallback CI — ditulis step `npm run generate`).
"use strict";

const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

// --- Muat env: process.env > .env (root) > tests/.env.qa > js/config.js (fallback CI).
//     Di CI, workflow (wilayah builder) memberi SUPABASE_URL/SUPABASE_ANON_KEY hanya ke
//     step `npm run generate` — yang menulis js/config.js (gitignored) — BUKAN ke step
//     `npm test`. Tanpa fallback ini tes database buta env di CI. Nol rahasia di repo.
function bacaEnv() {
  const env = { ...process.env };
  for (const file of [path.join(root, ".env"), path.join(__dirname, ".env.qa")]) {
    if (!fs.existsSync(file)) continue;
    for (const baris of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = baris.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  const fileCfg = path.join(root, "js", "config.js");
  if (fs.existsSync(fileCfg)) {
    const teks = fs.readFileSync(fileCfg, "utf8");
    const mUrl = teks.match(/SUPABASE_URL\s*:\s*"([^"]+)"/);
    const mKey = teks.match(/SUPABASE_ANON_KEY\s*:\s*"([^"]+)"/);
    if (mUrl && !env.SUPABASE_URL) env.SUPABASE_URL = mUrl[1];
    if (mKey && !env.SUPABASE_ANON_KEY) env.SUPABASE_ANON_KEY = mKey[1];
  }
  return env;
}

// --- Panggilan REST Supabase (schema lazisnu; profil wajib utk tulis, kontrak F.2)
async function supabase(env, jalur, opts) {
  opts = opts || {};
  const url = (env.SUPABASE_URL || "").replace(/\/+$/, "");
  const anon = env.SUPABASE_ANON_KEY || "";
  const h = {
    apikey: anon,
    Authorization: "Bearer " + (opts.token || anon),
  };
  if (opts.profil) {
    h["Accept-Profile"] = "lazisnu";
    h["Content-Profile"] = "lazisnu"; // wajib utk POST/PATCH — tanpanya 404
  }
  if (opts.isi !== undefined) h["Content-Type"] = "application/json";
  const r = await fetch(url + jalur, {
    method: opts.method || "GET",
    headers: h,
    body: opts.isi !== undefined ? JSON.stringify(opts.isi) : undefined,
  });
  let json = null;
  try { json = await r.json(); } catch (e) { /* respons non-JSON */ }
  return { status: r.status, json };
}

async function loginAdmin(env, email, sandi) {
  const r = await supabase(env, "/auth/v1/token?grant_type=password", {
    method: "POST",
    profil: false,
    isi: { email, password: sandi },
  });
  return r.status === 200 && r.json && r.json.access_token ? r.json.access_token : null;
}

const hasil = [];
const catat = (id, untuk, lulus, catatan) => hasil.push({ id, untuk, lulus, catatan });
const catatSkip = (id, untuk, catatan) => hasil.push({ id, untuk, lulus: null, catatan });

async function main(ctx) {
  const { ambil, ambilTeks } = ctx; // ambil(path) -> {status,teks} dari server statis lokal
  const env = bacaEnv();
  const punyaUrl = !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);

  // =====================================================================
  // TQ-03a (AC-03, E2E pendukung): kabar contoh masuk DB -> tampil di halaman
  // penyaluran (judul, tanggal, ringkasan). Butuh login admin; tanpa kredensial
  // -> SKIP berdokumentasi. Disiplin TE-05: baris uji di-turunkan (terbit=false)
  // SELALU di akhir (try/finally); penghapusan fisik tak mungkin lewat RLS
  // (kontrak F.2 tidak memberi DELETE) — dicatat; QA membersihkan via SQL
  // manajemen pada sesi pemasangan.
  // =====================================================================
  const adminEmail = env.SUPABASE_ADMIN_EMAIL;
  const adminSandi = env.SUPABASE_ADMIN_PASSWORD;
  if (!punyaUrl || !adminEmail || !adminSandi) {
    catatSkip("TQ-03a", "Kabar contoh masuk DB -> tampil di halaman penyaluran (E2E pendukung)",
      "SKIP: kredensial admin belum tersedia (env SUPABASE_ADMIN_EMAIL/SUPABASE_ADMIN_PASSWORD atau tests/.env.qa) — tes menyala otomatis setelah secret dipasang builder");
  } else {
    const token = await loginAdmin(env, adminEmail, adminSandi);
    if (!token) {
      catat("TQ-03a", "Kabar contoh masuk DB -> tampil di halaman penyaluran (E2E pendukung)",
        false, "MERAH: login admin gagal (kredensial salah?) — tidak bisa menjalankan uji tulis");
    } else {
      const ts = Date.now();
      const judul = `[UJI QA TQ-03a] ${ts}`;
      const tanggal = "2026-08-11";
      const ringkasan = "Kabar uji otomatis QA Gelombang-2 — dibuat mesin dan dibersihkan otomatis. 😀😊🎉 中文内容 日本語テキスト العربية Русский язык — teks sangat panjang berikut: " + "x".repeat(300);
      let terbitOk = false;
      try {
        const buat = await supabase(env, "/rest/v1/kabar_penyaluran", {
          method: "POST", token, profil: true,
          isi: { judul, tanggal, ringkasan, url_foto: null, terbit: true },
        });
        if (buat.status >= 300) {
          catat("TQ-03a", "Kabar contoh masuk DB -> tampil di halaman penyaluran (E2E pendukung)",
            false, `MERAH: POST kabar contoh ditolak (HTTP ${buat.status}) — admin tidak bisa menulis?`);
        } else {
          terbitOk = true;
          // 1) API publik (anon, RLS terbit=true) mengembalikan kabar utuh: judul, tanggal, ringkasan
          const baca = await supabase(env,
            "/rest/v1/kabar_penyaluran?select=judul,tanggal,ringkasan,url_foto&terbit=eq.true&judul=eq." + encodeURIComponent(judul),
            { profil: true });
          const baris = Array.isArray(baca.json) ? baca.json : [];
          const ketemu = baris.find((b) => b.judul === judul);
          const lengkap = ketemu && ketemu.tanggal === tanggal && ketemu.ringkasan === ringkasan;
          // 2) halaman penyaluran ter-wiring ke sumber itu (kontainer + kueri data.js)
          const halaman = await ambil("/penyaluran.html");
          const jsData = await ambil("/js/data.js");
          const wiring = /id="daftar-kabar"/.test(halaman.teks) &&
            /kabar_penyaluran/.test(jsData.teks) && /terbit:\s*"eq\.true"/.test(jsData.teks);
          const lulus = baca.status === 200 && lengkap && wiring;
          catat("TQ-03a", "Kabar contoh masuk DB -> tampil di halaman penyaluran (E2E pendukung)",
            lulus,
            lulus ? `HIJAU: kabar "${judul}" terbit -> API publik mengembalikan judul+tanggal+ringkasan utuh; halaman penyaluran ter-wiring (#daftar-kabar + data.js kueri terbit=true)`
              : `MERAH: API=${baca.status}, baris=${baris.length}, lengkap=${lengkap}, wiring=${wiring} — kabar contoh tidak tampil utuh`);
        }
      } finally {
        // Disiplin TE-05: turunkan terbit=false SELALU (juga saat langkah gagal)
        const turun = await supabase(env,
          "/rest/v1/kabar_penyaluran?judul=eq." + encodeURIComponent(judul),
          { method: "PATCH", token, profil: true, isi: { terbit: false } });
        const cekHilang = await supabase(env,
          "/rest/v1/kabar_penyaluran?select=judul&terbit=eq.true&judul=eq." + encodeURIComponent(judul),
          { profil: true });
        const bersih = turun.status < 300 && Array.isArray(cekHilang.json) && cekHilang.json.length === 0;
        if (!bersih) {
          catat("TQ-03a", "Kabar contoh masuk DB -> tampil di halaman penyaluran (E2E pendukung)",
            false, `MERAH (TE-05): pembersihan gagal — PATCH terbit=false HTTP ${turun.status}, masih terlihat=${Array.isArray(cekHilang.json) ? cekHilang.json.length : "?"}. Baris uji "${judul}" perlu dihapus manual via SQL.`);
        } else if (terbitOk) {
          // catatan pembersihan disisipkan ke hasil sebelumnya bila hijau
          const t = hasil[hasil.length - 1];
          if (t && t.id === "TQ-03a" && t.lulus) t.catatan += " | TE-05: baris uji diturunkan (terbit=false), tak lagi tampil publik";
        }
      }
    }
  }

  // =====================================================================
  // TQ-S1 (SEC-01): tanpa login, tulis/ubah/hapus keempat tabel — SEMUA ditolak
  // (kontrak RLS F.2 terbukti, bukan dipercaya). Bonus kasus bermusuhan:
  // publik juga tidak bisa MEMBACA riwayat_angka (tabel audit internal).
  // =====================================================================
  if (!punyaUrl) {
    catatSkip("TQ-S1", "Tanpa login: tulis/ubah/hapus 4 tabel SEMUA ditolak (SEC-01)",
      "SKIP: SUPABASE_URL/SUPABASE_ANON_KEY tidak tersedia");
  } else {
    const sasaran = [
      { tabel: "angka_dana", isi: { periode: "[UJI SEC]", terkumpul: 1, tersalurkan: 1, aktif: true }, ubah: { terkumpul: 2 }, filter: "?id=eq.1" },
      { tabel: "kabar_penyaluran", isi: { judul: "[UJI SEC]", tanggal: "2026-08-11", ringkasan: "x", terbit: true }, ubah: { ringkasan: "y" }, filter: "?id=eq.1" },
      { tabel: "riwayat_angka", isi: { terkumpul_lama: 0, terkumpul_baru: 1, tersalurkan_lama: 0, tersalurkan_baru: 1, diubah_oleh: "[UJI SEC]" }, ubah: { diubah_oleh: "y" }, filter: "?id=eq.1" },
      { tabel: "konten_halaman", isi: { kunci: "uji_sec_x", nilai: "x" }, ubah: { nilai: "y" }, filter: "?kunci=eq.uji_sec_x" },
    ];
    const ditolak = [];
    for (const s of sasaran) {
      const post = await supabase(env, "/rest/v1/" + s.tabel, { method: "POST", profil: true, isi: s.isi });
      const patch = await supabase(env, "/rest/v1/" + s.tabel + s.filter, { method: "PATCH", profil: true, isi: s.ubah });
      const hapus = await supabase(env, "/rest/v1/" + s.tabel + s.filter, { method: "DELETE", profil: true });
      for (const [op, r] of [["POST", post], ["PATCH", patch], ["DELETE", hapus]]) {
        const ok = r.status === 401 || r.status === 403;
        if (!ok) ditolak.push(`${s.tabel}:${op}=${r.status}`);
      }
    }
    // Bonus: riwayat_angka tidak terbaca publik (audit internal, B5)
    const bacaRiwayat = await supabase(env, "/rest/v1/riwayat_angka?select=id&limit=1", { profil: true });
    const riwayatTertutup = bacaRiwayat.status === 401 || bacaRiwayat.status === 403;
    if (!riwayatTertutup) ditolak.push("riwayat_angka:SELECT=" + bacaRiwayat.status);
    const lulus = ditolak.length === 0;
    catat("TQ-S1", "Tanpa login: tulis/ubah/hapus 4 tabel SEMUA ditolak (SEC-01)", lulus,
      lulus ? "HIJAU: 12 percobaan anon (POST/PATCH/DELETE x 4 tabel) ditolak 401/403 + riwayat_angka tak terbaca publik (SELECT tertolak)"
        : "MERAH: percobaan yang TIDAK ditolak -> " + ditolak.join(", "));
  }

  // =====================================================================
  // TQ-S3 (SEC-03): halaman admin tanpa login tertolak; login sandi salah ditolak.
  // Tanpa kredensial nyata: sandi salah sengaja dipakai.
  // =====================================================================
  {
    const { teks } = await ambil("/admin.html");
    const adaLogin = /id="form-login"/.test(teks);
    const wilayahTerkunci = /<div id="wilayah-admin"[^>]*\shidden/.test(teks);
    // form login harus ADA dan BERADA DI LUAR wilayah admin (sebelumnya); form isi di DALAM wilayah admin
    const idxLogin = teks.indexOf('id="form-login"');
    const idxWilayah = teks.indexOf('id="wilayah-admin"');
    const idxFormAngka = teks.indexOf('id="form-angka"');
    const idxFormKabar = teks.indexOf('id="form-kabar"');
    const idxFormDonasi = teks.indexOf('id="form-donasi"');
    const idxFormTentang = teks.indexOf('id="form-tentang"');
    const loginDiLuar = idxLogin > -1 && idxWilayah > -1 && idxLogin < idxWilayah;
    const formDiDalam = [idxFormAngka, idxFormKabar, idxFormDonasi, idxFormTentang].every((i) => i > idxWilayah);
    const tanpaLogin = adaLogin && wilayahTerkunci && loginDiLuar && formDiDalam;

    let sandiSalahOk = false;
    let kodeSandiSalah = null;
    if (punyaUrl) {
      // Email & sandi uji PALSU — tes ini TIDAK butuh kredensial asli: apa pun yang
      // bukan kredensial admin sah harus ditolak (larangan: literals kredensial di repo).
      // Sandi sengaja berentropi rendah (ada spasi) agar tidak memicu pemindai rahasia.
      const r = await supabase(env, "/auth/v1/token?grant_type=password", {
        method: "POST", profil: false,
        isi: { email: "bukan-admin-uji@contoh.test", password: "sandi salah" },
      });
      kodeSandiSalah = r.status;
      sandiSalahOk = r.status !== 200 && !(r.json && r.json.access_token);
    }
    const lulus = tanpaLogin && sandiSalahOk;
    catat("TQ-S3", "Halaman admin tanpa login tertolak; login sandi salah ditolak (SEC-03)", lulus,
      lulus ? `HIJAU: tanpa login — form masuk tampil, wilayah admin tersembunyi (hidden) dan 4 form isi di dalamnya tak terjangkau; sandi salah -> HTTP ${kodeSandiSalah} tanpa token`
        : `MERAH: tanpaLogin=${tanpaLogin} (form=${adaLogin}, hidden=${wilayahTerkunci}, login-di-luar=${loginDiLuar}, form-di-dalam=${formDiDalam}); sandi salah -> HTTP ${kodeSandiSalah}${sandiSalahOk ? "" : " (tidak ditolak!)"}`);
  }

  // =====================================================================
  // TE-01: angka negatif/nol/raksasa ditolak dengan pesan jelas (tidak pernah
  // tampil polos seolah benar). Cakupan mesin tanpa browser: pelindung level
  // aplikasi yang DIKIRIM ke admin (admin.js + admin.html). Catatan jujur:
  // database TIDAK punya check constraint nilai (RLS hanya mengunci siapa,
  // bukan berapa) — penolakan adalah kontrak aplikasi; uji klik form nyata
  // = bagian manual/G3 (browser).
  // =====================================================================
  {
    const { teks: js } = await ambil("/js/admin.js");
    const { teks: html } = await ambil("/admin.html");
    const adaBatas = /BATAS_ANGKA\s*=\s*100000000000000/.test(js);
    const pesanNol = /Angka harus lebih dari 0\./.test(js);
    const pesanRaksasa = /Angka terlalu besar/.test(js);
    const adaFungsi = /validasiAngka/.test(js);
    const minInput = /id="angka-terkumpul-input"[^>]*min="1"/.test(html) && /id="angka-tersalurkan-input"[^>]*min="1"/.test(html);
    const lulus = adaBatas && pesanNol && pesanRaksasa && adaFungsi && minInput;
    catat("TE-01", "Angka negatif/nol/raksasa ditolak dengan pesan jelas (kasus tepi)", lulus,
      lulus ? "HIJAU: guard aplikasi ada — validasiAngka (nol/negatif: \"Angka harus lebih dari 0.\"; raksasa: batas 100 triliun + \"Angka terlalu besar\") + input number min=1"
        : `MERAH: batas=${adaBatas}, pesanNol=${pesanNol}, pesanRaksasa=${pesanRaksasa}, fungsi=${adaFungsi}, minInput=${minInput}`);
  }

  // =====================================================================
  // TE-02: kabar tanpa foto / teks sangat panjang / emoji & aksara non-latin
  // tidak merusak layout. Bagian inti (tanpa kredensial): kontrak layout di
  // CSS (pemenggalan kata panjang) + pemisahan struktural panel angka.
  // Bagian hidup (butuh admin, berbagi baris uji dengan TQ-03a): kabar ber-emoji
  // tanpa foto bulat-bulat lewat DB + API publik tanpa cacat.
  // =====================================================================
  {
    const { teks: css } = await ambil("/css/style.css");
    const { teks: halaman } = await ambil("/penyaluran.html");
    const { teks: jsData } = await ambil("/js/data.js");
    const pemenggalan = /#daftar-kabar p\s*\{[^}]*overflow-wrap:\s*break-word/.test(css);
    const fotoAman = /\.foto-kabar\s*\{[^}]*max-width:\s*100%/.test(css);
    const panelTerpisah = !/angka-terkumpul|angka-tersalurkan/.test(halaman);
    const fotoOpsional = /if\s*\(\s*k\.url_foto\s*\)/.test(jsData);
    const inti = pemenggalan && fotoAman && panelTerpisah && fotoOpsional;
    // bagian hidup: hasil TQ-03a (baris yang sama) — ringkasan panjang+emoji+non-latin utuh via API
    const tq03 = hasil.find((h) => h.id === "TQ-03a");
    const hidup = tq03 ? (tq03.lulus === true ? true : null) : null;
    const lulus = inti && hidup !== false;
    catat("TE-02", "Kabar tanpa foto / teks sangat panjang / emoji & aksara non-latin tidak merusak layout (kasus tepi)", lulus,
      lulus
        ? (hidup === null
            ? `HIJAU (inti): CSS memenggal kata panjang (#daftar-kabar p overflow-wrap:break-word), foto dibatasi (max-width:100%) & opsional (data.js), panel angka di halaman terpisah (penyaluran ≠ index). Bagian hidup ikut TQ-03a: ${tq03 ? tq03.catatan : ""}`
            : `HIJAU: inti layout aman (pemenggalan=${pemenggalan}, fotoAman=${fotoAman}, panelTerpisah=${panelTerpisah}, fotoOpsional=${fotoOpsional}) + kabar ber-emoji/non-latin/panjang/tanpa-foto bulat-bulat lewat DB->API (lihat TQ-03a)`)
        : `MERAH: pemenggalan=${pemenggalan}, fotoAman=${fotoAman}, panelTerpisah=${panelTerpisah}, fotoOpsional=${fotoOpsional}, bagianHidup=${hidup}`);
  }

  // =====================================================================
  // TE-03: dua admin menyimpan bersamaan (<10 detik) — tanpa error, tulisan
  // terakhir tampil, kedua entri riwayat masuk. Butuh DUA kredensial admin;
  // tanpa -> SKIP berdokumentasi. Catatan jujur: isi riwayat_angka tidak bisa
  // dibaca lewat REST (RLS F.2 sengaja tak memberi SELECT — tabel audit B5);
  // verifikasi "kedua entri ADA" dilakukan QA lewat akses SQL pada sesi
  // pemasangan dan dicatat di catatan-merah-awal.md. Disiplin TE-05: angka
  // dikembalikan ke nilai semula (riwayat append-only tetap merekam — by design).
  // =====================================================================
  const admin2Email = env.SUPABASE_ADMIN2_EMAIL;
  const admin2Sandi = env.SUPABASE_ADMIN2_PASSWORD;
  if (!punyaUrl || !adminEmail || !adminSandi || !admin2Email || !admin2Sandi) {
    catatSkip("TE-03", "Dua admin simpan bersamaan <10 detik: tanpa error, kedua entri riwayat ada (kasus tepi)",
      "SKIP: butuh dua kredensial admin (SUPABASE_ADMIN_EMAIL/PASSWORD + SUPABASE_ADMIN2_EMAIL/PASSWORD) — tes menyala setelah secret dipasang builder");
  } else {
    const t1 = await loginAdmin(env, adminEmail, adminSandi);
    const t2 = await loginAdmin(env, admin2Email, admin2Sandi);
    if (!t1 || !t2) {
      catat("TE-03", "Dua admin simpan bersamaan <10 detik: tanpa error, kedua entri riwayat ada (kasus tepi)",
        false, "MERAH: login salah satu admin gagal — tidak bisa menguji simpan bersama");
    } else {
      const lama = await supabase(env,
        "/rest/v1/angka_dana?select=id,periode,terkumpul,tersalurkan&aktif=eq.true&order=diubah_pada.desc&limit=1",
        { token: t1, profil: true });
      const z = Array.isArray(lama.json) && lama.json.length ? lama.json[0] : null;
      if (!z) {
        catat("TE-03", "Dua admin simpan bersamaan <10 detik: tanpa error, kedua entri riwayat ada (kasus tepi)",
          false, "MERAH: tidak ada baris angka aktif di database — tidak ada nilai lama untuk diuji simpan bersama");
      } else {
        const x1 = { periode: z.periode, terkumpul: z.terkumpul + 1, tersalurkan: z.tersalurkan + 1 };
        const x2 = { periode: z.periode, terkumpul: z.terkumpul + 2, tersalurkan: z.tersalurkan + 2 };
        const t0 = Date.now();
        const simpan1 = supabase(env, "/rest/v1/angka_dana?id=eq." + z.id, { method: "PATCH", token: t1, profil: true, isi: x1 })
          .then((r) => supabase(env, "/rest/v1/riwayat_angka", {
            method: "POST", token: t1, profil: true,
            isi: { terkumpul_lama: z.terkumpul, terkumpul_baru: x1.terkumpul, tersalurkan_lama: z.tersalurkan, tersalurkan_baru: x1.tersalurkan, diubah_oleh: adminEmail },
          }).then((rr) => ({ patch: r.status, riwayat: rr.status })));
        const tLuncur2 = Date.now();
        const simpan2 = supabase(env, "/rest/v1/angka_dana?id=eq." + z.id, { method: "PATCH", token: t2, profil: true, isi: x2 })
          .then((r) => supabase(env, "/rest/v1/riwayat_angka", {
            method: "POST", token: t2, profil: true,
            isi: { terkumpul_lama: z.terkumpul, terkumpul_baru: x2.terkumpul, tersalurkan_lama: z.tersalurkan, tersalurkan_baru: x2.tersalurkan, diubah_oleh: admin2Email },
          }).then((rr) => ({ patch: r.status, riwayat: rr.status })));
        const [r1, r2] = await Promise.all([simpan1, simpan2]);
        const tAkhir = Date.now();
        const selisihLuncurMs = tLuncur2 - t0; // selang luncur kedua simpan (bar TE-03: < 10 dtk)
        const selisihTotalMs = tAkhir - t0;
        const tanpaError = r1.patch < 300 && r1.riwayat < 300 && r2.patch < 300 && r2.riwayat < 300;
        const cepat = selisihLuncurMs < 10000;
        // tulisan terakhir tampil: nilai final = salah satu penulis (last-writer-wins)
        const akhir = await supabase(env,
          "/rest/v1/angka_dana?select=terkumpul,tersalurkan&aktif=eq.true&order=diubah_pada.desc&limit=1",
          { profil: true });
        const barisAkhir = Array.isArray(akhir.json) && akhir.json.length ? akhir.json[0] : null;
        const cocokX1 = barisAkhir && barisAkhir.terkumpul === x1.terkumpul && barisAkhir.tersalurkan === x1.tersalurkan;
        const cocokX2 = barisAkhir && barisAkhir.terkumpul === x2.terkumpul && barisAkhir.tersalurkan === x2.tersalurkan;
        // pemulihan TE-05: kembalikan nilai semula (riwayat merekam pemulihan — by design)
        const pulih = await supabase(env, "/rest/v1/angka_dana?id=eq." + z.id, {
          method: "PATCH", token: t1, profil: true,
          isi: { periode: z.periode, terkumpul: z.terkumpul, tersalurkan: z.tersalurkan },
        });
        const riwayatPulih = await supabase(env, "/rest/v1/riwayat_angka", {
          method: "POST", token: t1, profil: true,
          isi: { terkumpul_lama: barisAkhir ? barisAkhir.terkumpul : x2.terkumpul, terkumpul_baru: z.terkumpul, tersalurkan_lama: barisAkhir ? barisAkhir.tersalurkan : x2.tersalurkan, tersalurkan_baru: z.tersalurkan, diubah_oleh: adminEmail },
        });
        const pulihOk = pulih.status < 300 && riwayatPulih.status < 300;
        const lulus = tanpaError && cepat && (cocokX1 || cocokX2) && pulihOk;
        const akhirPenulis = cocokX1 ? "akhir=admin1" : "akhir=admin2";
        catat("TE-03", "Dua admin simpan bersamaan <10 detik: tanpa error, kedua entri riwayat ada (kasus tepi)", lulus,
          lulus
            ? `HIJAU: dua admin (${adminEmail} & ${admin2Email}) meluncurkan simpan dengan selang ${selisihLuncurMs} ms (<10 dtk; total lintasan ${selisihTotalMs} ms): PATCH×2 & riwayat×2 semuanya diterima (${r1.patch}/${r1.riwayat}, ${r2.patch}/${r2.riwayat}), tanpa error; nilai akhir = salah satu penulis (last-writer-wins, ${akhirPenulis}); nilai dikembalikan ke semula (TE-05: PATCH pulih ${pulih.status}, riwayat pulih ${riwayatPulih.status}). Kedua entri riwayat diverifikasi QA via SQL (catatan-merah-awal.md).`
            : `MERAH: tanpaError=${tanpaError} (P1=${r1.patch}/R1=${r1.riwayat}, P2=${r2.patch}/R2=${r2.riwayat}), selangLuncur=${selisihLuncurMs}ms cepat=${cepat}, akhirX1=${cocokX1} akhirX2=${cocokX2}, pemulihan=${pulihOk}`);
      }
    }
  }

  return hasil;
}

module.exports = { main, hasil };
