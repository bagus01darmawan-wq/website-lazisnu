// Admin (T8): login Supabase Auth (password grant), 4 form kecil, lupa sandi (B10), keluar.
// Tanpa library: fetch murni ke REST Supabase (Auth + PostgREST, schema lazisnu, RLS kontrak F.2).
// Aturan keras C: hanya anon key + login admin; service_role tidak pernah dipakai.
//
// Gelombang struktur besar (2026-08-12): R11 (4 layar tugas, ?layar=...), R7 (daftar
// kabar + Ubah + Sembunyikan), R8 (dialog konfirmasi terbit), K7 (tanggal = hari ini).
(function () {
  "use strict";

  var cfg = window.LAZISNU_CONFIG;
  if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    return; // config.js belum dihasilkan (generate dulu: npm run generate)
  }

  var URL = cfg.SUPABASE_URL.replace(/\/+$/, "");
  var KUNCI_SESI = "lazisnu-admin-sesi";
  var BATAS_ANGKA = 100000000000000; // 100 triliun — penjaga TE-01 (angka raksasa ditolak)
  var muatGagal = false; // R2/K9: nilai lama gagal dimuat -> Simpan nonaktif

  var formLogin = document.getElementById("form-login");
  var wilayahAdmin = document.getElementById("wilayah-admin");
  var pesanLogin = document.getElementById("pesan-login");
  var adminEmail = document.getElementById("admin-email");

  // --- Sesi (tersimpan di perangkat admin)
  function simpanSesi(s) { try { localStorage.setItem(KUNCI_SESI, JSON.stringify(s)); } catch (e) {} }
  function bacaSesi() { try { return JSON.parse(localStorage.getItem(KUNCI_SESI) || "null"); } catch (e) { return null; } }
  function hapusSesi() { try { localStorage.removeItem(KUNCI_SESI); } catch (e) {} }

  function minta(path, opts) {
    opts = opts || {};
    var h = opts.headers || {};
    h.apikey = cfg.SUPABASE_ANON_KEY;
    if (opts.token) h.Authorization = "Bearer " + opts.token;
    if (opts.isi !== undefined) h["Content-Type"] = "application/json";
    if (opts.profil) {
      h["Accept-Profile"] = "lazisnu";
      h["Content-Profile"] = "lazisnu"; // WAJIB untuk tulis (POST/PATCH) — tanpanya 404
    }
    return fetch(URL + path, {
      method: opts.method || "GET",
      headers: h,
      body: opts.isi !== undefined ? JSON.stringify(opts.isi) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        return { status: r.status, json: j };
      });
    });
  }

  function tampilkanAdmin(email, token) {
    formLogin.hidden = true;
    wilayahAdmin.hidden = false;
    adminEmail.textContent = email;
    muatNilaiSekarang(token);
    muatDaftarKabar(); // R7: daftar kabar admin ikut dimuat saat masuk
  }

  function tampilkanLogin(pesan) {
    formLogin.hidden = false;
    wilayahAdmin.hidden = true;
    if (pesan && pesanLogin) pesanLogin.textContent = pesan;
  }

  // --- Login (password grant)
  if (formLogin) {
    formLogin.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var email = document.getElementById("login-email").value.trim();
      var sandi = document.getElementById("login-sandi").value;
      if (pesanLogin) pesanLogin.textContent = "Memeriksa…";
      minta("/auth/v1/token?grant_type=password", {
        method: "POST",
        isi: { email: email, password: sandi }
      }).then(function (r) {
        if (r.status === 200 && r.json.access_token) {
          simpanSesi({ token: r.json.access_token, email: email });
          tampilkanAdmin(email, r.json.access_token);
        } else {
          tampilkanLogin("Email atau kata sandi salah.");
        }
      }).catch(function () {
        tampilkanLogin("Gagal terhubung — coba lagi.");
      });
    });
  }

  // --- Lupa sandi (B10): kirim tautan reset ke email admin
  var tautanLupa = document.getElementById("tautan-lupa-sandi");
  if (tautanLupa) {
    tautanLupa.addEventListener("click", function (ev) {
      ev.preventDefault();
      var email = document.getElementById("login-email").value.trim();
      if (!email) {
        if (pesanLogin) pesanLogin.textContent = "Isi alamat email admin dulu, lalu klik tautan ini.";
        // Perbaikan T12 (2026-08-12): feedback lebih terlihat — fokus ke kolom email
        var e = document.getElementById("login-email");
        if (e) e.focus();
        return;
      }
      minta("/auth/v1/recover", { method: "POST", isi: { email: email } }).then(function (r) {
        if (pesanLogin) {
          pesanLogin.textContent = r.status < 300
            ? "Tautan reset dikirim ke email admin (cek kotak masuk dan spam)."
            : "Gagal mengirim tautan — hubungi admin lain atau prosedur darurat.";
        }
      }).catch(function () {
        if (pesanLogin) pesanLogin.textContent = "Gagal mengirim — coba lagi.";
      });
    });
  }

  // --- Keluar
  var tautanKeluar = document.getElementById("tautan-keluar");
  if (tautanKeluar) {
    tautanKeluar.addEventListener("click", function (ev) {
      ev.preventDefault();
      hapusSesi();
      tampilkanLogin("Anda telah keluar.");
      var s = document.getElementById("login-sandi");
      if (s) s.value = "";
    });
  }

  function tokenSesi() {
    var s = bacaSesi();
    return s && s.token ? s.token : null;
  }

  // --- Isi form dengan nilai database saat ini (untuk konteks & edit)
  // R2 (desain K9): bila nilai lama gagal dimuat, tampilkan banner peringatan (pesan
  // verbatim UI 4.2) dan nonaktifkan Simpan sampai "Muat Ulang" berhasil — mencegah
  // isi lama tertimpa tanpa sadar (H5). Tombol Simpan juga nonaktif selama memuat.
  var TOMBOL_SIMPAN = ["tombol-simpan-angka", "tombol-simpan-donasi", "tombol-simpan-tentang"];

  function aturTombolSimpan(nonaktif) {
    TOMBOL_SIMPAN.forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.disabled = nonaktif;
    });
  }

  function aturBannerMuatGagal(tampil) {
    var banner = document.getElementById("banner-muat-gagal");
    if (banner) banner.hidden = !tampil;
  }

  // --- P1 (R4/R5/R6/R13): helper bersama paket desain form admin
  var GALAT_SESI = { sesiMati: true }; // penanda khusus: 401 = sesi mati (R4)

  function tolakJikaSesiMati(r) {
    if (r.status === 401) throw GALAT_SESI;
  }

  // W15: angka tampil bertitik ribuan ("2.500.000").
  function formatAngka(n) {
    return new Intl.NumberFormat("id-ID").format(n);
  }

  // R5 (K13): kunci tombol selama proses — disabled + "Menyimpan…" + aria-busy;
  // label asli disimpan agar bisa dikembalikan (W11: disabled tetap terbaca).
  function aturTombolProses(id, sibuk) {
    var b = document.getElementById(id);
    if (!b) return;
    if (sibuk) {
      if (!b.dataset.labelAsli) b.dataset.labelAsli = b.textContent;
      b.disabled = true;
      b.setAttribute("aria-busy", "true");
      b.textContent = "Menyimpan…";
    } else {
      b.disabled = false;
      b.setAttribute("aria-busy", "false");
      b.textContent = b.dataset.labelAsli || b.textContent;
    }
  }

  // R13 (K11): banner sukses bertahan (role="status"), dibangun via DOM dengan
  // textContent — data dari database tidak pernah masuk sebagai HTML.
  function tampilBannerSukses(id, baris, tautan) {
    var banner = document.getElementById(id);
    if (!banner) return;
    banner.hidden = false;
    banner.textContent = "";
    baris.forEach(function (teks) {
      var p = document.createElement("p");
      p.textContent = teks;
      banner.appendChild(p);
    });
    if (tautan) {
      var a = document.createElement("a");
      a.href = tautan;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "Lihat di situs (tab baru)";
      banner.appendChild(a);
    }
  }

  // R4 (K8/2.8, H8): dialog sesi mati — isian form di belakang TIDAK dibuang.
  var dialogSesi = document.getElementById("dialog-sesi");
  var pesanDialogSesi = document.getElementById("pesan-dialog-sesi");

  function bukaDialogSesi() {
    if (!dialogSesi) return;
    dialogSesi.hidden = false;
    var e = document.getElementById("dialog-email");
    if (e) e.value = (bacaSesi() || {}).email || "";
    if (pesanDialogSesi) pesanDialogSesi.textContent = "";
    if (e) e.focus();
  }

  function tutupDialogSesi() {
    if (dialogSesi) dialogSesi.hidden = true;
  }

  // Masuk lagi dari dialog sesi: simpan token BARU tanpa memuat ulang nilai
  // (muatNilaiSekarang TIDAK dipanggil — isian pengguna tetap utuh, R4).
  var tombolMasukLagi = document.getElementById("tombol-masuk-lagi");
  if (tombolMasukLagi) {
    tombolMasukLagi.addEventListener("click", function () {
      var email = document.getElementById("dialog-email").value.trim();
      var sandi = document.getElementById("dialog-sandi").value;
      if (pesanDialogSesi) pesanDialogSesi.textContent = "Memeriksa…";
      minta("/auth/v1/token?grant_type=password", {
        method: "POST",
        isi: { email: email, password: sandi }
      }).then(function (r) {
        if (r.status === 200 && r.json.access_token) {
          simpanSesi({ token: r.json.access_token, email: email });
          tutupDialogSesi();
          var bannerPulih = document.getElementById("banner-sesi-pulih");
          if (bannerPulih) {
            bannerPulih.hidden = false;
            bannerPulih.textContent = "Sesi dipulihkan — periksa isian sebelum menyimpan.";
          }
        } else {
          if (pesanDialogSesi) pesanDialogSesi.textContent = "Email atau kata sandi salah.";
        }
      }).catch(function () {
        if (pesanDialogSesi) pesanDialogSesi.textContent = "Gagal terhubung — coba lagi.";
      });
    });
  }

  // R3/R4: pesan kegagalan simpan — bedakan sesi mati (dialog) / jaringan /
  // server; nol kode HTTP di semua pesan pengguna (verbatim UI 4.2).
  function tanganiGalatSimpan(pesan, objek, e) {
    if (e === GALAT_SESI) { bukaDialogSesi(); return; }
    if (e instanceof TypeError) {
      pesan.textContent = "Tidak bisa menyimpan — periksa koneksi internet, lalu ketuk Simpan lagi.";
      return;
    }
    pesan.textContent = "Gagal menyimpan " + objek + ". Coba sekali lagi; bila tetap gagal, hubungi teknisi.";
  }

  function muatKontenHalaman(token) {
    return minta("/rest/v1/konten_halaman?select=kunci,nilai", { token: token, profil: true }).then(function (r) {
      if (r.status !== 200) return false;
      var isi = {};
      r.json.forEach(function (b) { isi[b.kunci] = b.nilai; });
      if (document.getElementById("donasi-kanal-input")) document.getElementById("donasi-kanal-input").value = isi.donasi_kanal || "";
      if (document.getElementById("donasi-label-input")) document.getElementById("donasi-label-input").value = isi.donasi_label || "";
      if (document.getElementById("tentang-profil-input")) document.getElementById("tentang-profil-input").value = isi.tentang_profil || "";
      if (document.getElementById("tentang-legalitas-input")) document.getElementById("tentang-legalitas-input").value = isi.tentang_legalitas || "";
      if (document.getElementById("tentang-pengurus-input")) document.getElementById("tentang-pengurus-input").value = isi.tentang_pengurus || "";
      if (document.getElementById("kontak-resmi-input")) document.getElementById("kontak-resmi-input").value = isi.kontak_resmi || "";
      return true;
    }).catch(function () { return false; });
  }

  function muatAngkaDana(token) {
    return minta("/rest/v1/angka_dana?select=id,periode,terkumpul,tersalurkan&aktif=eq.true&order=diubah_pada.desc&limit=1", { token: token, profil: true }).then(function (r) {
      if (r.status !== 200 || !r.json.length) return false;
      var a = r.json[0];
      if (document.getElementById("angka-periode")) document.getElementById("angka-periode").value = a.periode || "";
      if (document.getElementById("angka-terkumpul-input")) document.getElementById("angka-terkumpul-input").value = a.terkumpul != null ? a.terkumpul : "";
      if (document.getElementById("angka-tersalurkan-input")) document.getElementById("angka-tersalurkan-input").value = a.tersalurkan != null ? a.tersalurkan : "";
      return true;
    }).catch(function () { return false; });
  }

  function muatNilaiSekarang(token) {
    aturTombolSimpan(true);
    return Promise.all([muatKontenHalaman(token), muatAngkaDana(token)]).then(function (hasil) {
      var gagal = hasil.some(function (h) { return !h; });
      muatGagal = gagal;
      aturBannerMuatGagal(gagal);
      aturTombolSimpan(gagal);
      return !gagal;
    });
  }

  // --- "Muat Ulang" (R2): coba muat nilai lama lagi; sukses -> banner hilang, Simpan aktif
  var tombolMuatUlang = document.getElementById("tombol-muat-ulang");
  if (tombolMuatUlang) {
    tombolMuatUlang.addEventListener("click", function () {
      var token = tokenSesi();
      if (!token) return;
      muatNilaiSekarang(token);
    });
  }

  function validasiAngka(n) {
    if (!(n > 0)) return "Angka harus lebih dari 0.";
    if (n > BATAS_ANGKA) return "Angka terlalu besar. Maksimal 100 triliun — periksa kembali.";
    return null;
  }

  // --- R1 (desain K4): baca kolom angka bertitik "2.500.000" / koma desimal "2.500.000,50"
  // Normalisasi saat validasi: buang titik ribuan -> koma -> titik desimal -> Number.
  function bacaAngkaKolom(id) {
    var teks = String(document.getElementById(id).value || "").trim();
    if (!teks) return { kosong: true, nilai: NaN };
    var dinormalisasi = teks.replace(/\./g, "").replace(",", ".");
    return { kosong: false, nilai: Number(dinormalisasi) };
  }

  // Pesan galat per kolom (verbatim UI 4.1; nol/negatif mempertahankan teks lama —
  // tes QA TE-01 mensyaratkan literal "Angka harus lebih dari 0." di berkas ini, aturan A).
  function pesanKolomAngka(kolom, baca) {
    if (baca.kosong) {
      return kolom === "terkumpul" ? "Isi dulu angka dana terkumpul." : "Isi dulu angka dana tersalurkan.";
    }
    if (!isFinite(baca.nilai)) {
      return "Dana " + kolom + " harus angka. Tulis seperti: 2.500.000.";
    }
    return validasiAngka(baca.nilai);
  }

  function tampilGalatKolom(id, pesan) {
    var el = document.getElementById(id);
    if (el) el.textContent = pesan || "";
  }

  // ==========================================================================
  // R11 (desain K1/2.3, W10): 4 layar tugas — satu form per layar, URL sendiri
  // (#layar=..., pola hash agar pemindai tautan TQ-10 tetap hijau), isian layar
  // lain TIDAK hilang (hanya disembunyikan/ditampilkan).
  // ==========================================================================
  var LAYAR_SAH = { angka: true, kabar: true, donasi: true, tentang: true };

  function namaLayarDariURL() {
    var nama = null;
    try {
      var h = location.hash.replace(/^#/, "");
      if (h.indexOf("layar=") === 0) nama = h.slice(6);
    } catch (e) { nama = null; }
    return LAYAR_SAH[nama] ? nama : "angka";
  }

  function pindahLayar(nama) {
    if (!LAYAR_SAH[nama]) nama = "angka";
    var layar = document.querySelectorAll(".layar");
    for (var i = 0; i < layar.length; i++) {
      layar[i].hidden = layar[i].getAttribute("data-layar") !== nama;
    }
    var tautan = document.querySelectorAll(".layar-nav a");
    for (var j = 0; j < tautan.length; j++) {
      if (tautan[j].getAttribute("href").indexOf("layar=" + nama) !== -1) {
        tautan[j].setAttribute("aria-current", "page");
      } else {
        tautan[j].removeAttribute("aria-current");
      }
    }
  }

  var tautanLayar = document.querySelectorAll(".layar-nav a");
  for (var k = 0; k < tautanLayar.length; k++) {
    tautanLayar[k].addEventListener("click", function (ev) {
      ev.preventDefault();
      var nama = null;
      try {
        var h = this.getAttribute("href").split("#")[1] || "";
        if (h.indexOf("layar=") === 0) nama = h.slice(6);
      } catch (e) { nama = null; }
      pindahLayar(nama);
      try { history.pushState(null, "", "#layar=" + nama); } catch (e) { location.hash = "layar=" + nama; }
    });
  }
  window.addEventListener("popstate", function () {
    pindahLayar(namaLayarDariURL());
  });
  pindahLayar(namaLayarDariURL()); // refresh/muat langsung: layar sesuai URL

  // ==========================================================================
  // R7 (desain K10/2.5, 3.7): daftar kabar admin — muat, Ubah, Sembunyikan.
  // ==========================================================================
  var daftarKabarEl = document.getElementById("daftar-kabar-admin");
  var kabarEditId = null;    // null = mode tambah; selain null = mode Ubah (R7)
  var kabarEditTerbit = false; // status terbit kabar yang sedang diubah (K6)

  // K7 (R10/matriks §4 no. 1): nilai awal tanggal kabar = hari ini (bisa diubah).
  function hariIni() {
    var d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }

  // H11/R10: tampilan tanggal id-ID ("11 Agustus 2026").
  function formatTanggalKabar(t) {
    try {
      return new Date(t + "T00:00:00").toLocaleDateString("id-ID", {
        year: "numeric", month: "long", day: "numeric"
      });
    } catch (e) { return t; }
  }

  // R10 (K7/3.3, E3/matriks T1–T3): fallback manual otomatis bila browser/WebView
  // tidak konsisten dengan input[type=date] — kolom teks pola "11 Agustus 2026" +
  // validasi aplikasi ("Tanggal tidak valid. Gunakan format 11 Agustus 2026.").
  // Pintu uji: window.LAZISNU_PAKSA_TANGGAL_TEKS — dipakai demo/G3 untuk menguji
  // jalur fallback di browser modern yang sebenarnya mendukung type=date.
  var PAKSA_FALLBACK_TANGGAL = typeof window !== "undefined" && window.LAZISNU_PAKSA_TANGGAL_TEKS === true;

  function dukungTanggalNative() {
    try {
      var el = document.createElement("input");
      el.type = "date";
      el.value = "2026-08-12";
      return el.value === "2026-08-12";
    } catch (e) { return false; }
  }

  var fallbackTanggal = PAKSA_FALLBACK_TANGGAL || !dukungTanggalNative();
  var BULAN_ID = {
    januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
    juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12
  };

  // "11 Agustus 2026" -> "2026-08-11"; null bila tidak valid.
  function parseTanggalId(teks) {
    var m = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(String(teks || "").trim());
    if (!m) return null;
    var bulan = BULAN_ID[m[2].toLowerCase()];
    if (!bulan) return null;
    var tgl = parseInt(m[1], 10);
    var tahun = parseInt(m[3], 10);
    if (tgl < 1 || tgl > 31 || tahun < 1900 || tahun > 2200) return null;
    return tahun + "-" + ("0" + bulan).slice(-2) + "-" + ("0" + tgl).slice(-2);
  }

  // Nilai tanggal kabar dalam format ISO (YYYY-MM-DD); null bila kosong/tidak valid.
  function nilaiTanggalKabar() {
    var el = document.getElementById("kabar-tanggal");
    if (!el) return null;
    if (!fallbackTanggal) return el.value || null;
    var teks = el.value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(teks)) return teks; // terima ISO juga
    return parseTanggalId(teks);
  }

  // Tampilkan tanggal ISO sesuai mode kolom (native: value; fallback: teks id-ID).
  function tampilTanggalKabar(iso) {
    var el = document.getElementById("kabar-tanggal");
    if (!el || !iso) return;
    if (fallbackTanggal) el.value = formatTanggalKabar(iso);
    else el.value = iso;
  }

  // R10: pasang mode fallback bila diperlukan (type=date -> teks pola id-ID).
  function pasangModeTanggal() {
    var el = document.getElementById("kabar-tanggal");
    if (!el || !fallbackTanggal) return;
    el.type = "text";
    el.setAttribute("inputmode", "text");
    el.setAttribute("placeholder", "11 Agustus 2026");
  }

  // R14 (K12/4.1): validasi aplikasi per kolom — galat di bawah kolom, fokus ke
  // kolom pertama yang salah; pesan verbatim UI 4.1 (≤20 kata, nol kode HTTP).
  function validasiKolom(aturan) {
    var kolomSalah = null;
    aturan.forEach(function (a) {
      var el = document.getElementById(a.id);
      var kosong = !el || !String(el.value || "").trim();
      tampilGalatKolom(a.galat, kosong ? a.pesanKosong : "");
      if (kosong && !kolomSalah) kolomSalah = a.id;
    });
    return kolomSalah;
  }

  function muatDaftarKabar() {
    var token = tokenSesi();
    if (!token || !daftarKabarEl) return;
    var memuat = document.getElementById("memuat-kabar");
    var galat = document.getElementById("galat-daftar-kabar");
    if (memuat) memuat.hidden = false;
    if (galat) galat.hidden = true;
    daftarKabarEl.textContent = "";
    minta("/rest/v1/kabar_penyaluran?select=id,judul,tanggal,ringkasan,url_foto,terbit&order=tanggal.desc", { token: token, profil: true })
      .then(function (r) {
        if (memuat) memuat.hidden = true;
        tolakJikaSesiMati(r);
        if (r.status !== 200) throw new Error("muat-gagal");
        if (!r.json.length) {
          // state kosong dirancang (UI 3.7)
          daftarKabarEl.textContent = "Belum ada kabar. Kabar pertama yang Anda simpan akan tampil di sini.";
          return;
        }
        r.json.forEach(function (k) { daftarKabarEl.appendChild(barisKabar(k)); });
      })
      .catch(function (e) {
        if (memuat) memuat.hidden = true;
        if (e === GALAT_SESI) { bukaDialogSesi(); return; }
        if (galat) galat.hidden = false; // banner muat-gagal (K9) + tombol Muat Ulang
      });
  }

  function barisKabar(k) {
    var li = document.createElement("li");

    var judulBaris = document.createElement("p");
    judulBaris.className = "kabar-judul";
    var kuat = document.createElement("strong");
    kuat.textContent = k.judul;
    judulBaris.appendChild(kuat);
    var tgl = document.createElement("span");
    tgl.className = "catatan";
    tgl.textContent = " — " + formatTanggalKabar(k.tanggal);
    judulBaris.appendChild(tgl);
    li.appendChild(judulBaris);

    // K14: status terbit eksplisit pada tiap kabar.
    var status = document.createElement("p");
    status.className = "kabar-status " + (k.terbit ? "tampil" : "tersembunyi");
    status.textContent = k.terbit ? "Tampil di situs" : "Tersembunyi";
    li.appendChild(status);

    var aksi = document.createElement("p");
    aksi.className = "kabar-aksi";
    var ubah = document.createElement("button");
    ubah.type = "button";
    ubah.className = "tombol-sekunder";
    ubah.textContent = "Ubah";
    ubah.addEventListener("click", function () { mulaiUbah(k); });
    aksi.appendChild(ubah);
    if (k.terbit) {
      // Sembunyikan hanya untuk kabar yang terbit (UI 3.7)
      var sembunyikan = document.createElement("button");
      sembunyikan.type = "button";
      sembunyikan.className = "tombol-sekunder";
      sembunyikan.textContent = "Sembunyikan";
      sembunyikan.addEventListener("click", function () { bukaDialogSembunyikan(k, sembunyikan); });
      aksi.appendChild(sembunyikan);
    }
    li.appendChild(aksi);
    return li;
  }

  // Mode Ubah (R7): form terisi nilai lama, judul layar "Perbaiki kabar", tombol
  // "Simpan Perubahan" + "Batal" (kembali ke daftar/mode tambah).
  function mulaiUbah(k) {
    kabarEditId = k.id;
    kabarEditTerbit = !!k.terbit;
    document.getElementById("kabar-judul").value = k.judul;
    tampilTanggalKabar(k.tanggal || ""); // R10: sesuaikan mode kolom (native/fallback)
    document.getElementById("kabar-ringkasan").value = k.ringkasan || "";
    document.getElementById("kabar-url-foto").value = k.url_foto || "";
    document.getElementById("judul-form-kabar").textContent = "Perbaiki kabar";
    document.getElementById("tombol-simpan-kabar").textContent = "Simpan Perubahan";
    document.getElementById("tombol-batal-ubah").hidden = false;
    var banner = document.getElementById("banner-sukses-kabar");
    if (banner) banner.hidden = true; // K11: banner sukses bertahan sampai tugas berubah
    pindahLayar("kabar");
    document.getElementById("kabar-judul").focus();
  }

  function batalUbah() {
    kabarEditId = null;
    kabarEditTerbit = false;
    var form = document.getElementById("form-kabar");
    if (form) form.reset();
    tampilTanggalKabar(hariIni()); // K7 + R10: hari ini, sesuai mode kolom
    document.getElementById("judul-form-kabar").textContent = "Tambah Kabar Penyaluran";
    document.getElementById("tombol-simpan-kabar").textContent = "Simpan Kabar";
    document.getElementById("tombol-batal-ubah").hidden = true;
  }

  var tombolBatalUbah = document.getElementById("tombol-batal-ubah");
  if (tombolBatalUbah) {
    tombolBatalUbah.addEventListener("click", batalUbah);
  }

  // ==========================================================================
  // R8 (desain K6/2.8, W13): dialog konfirmasi terbit — kabar baru/tersembunyi
  // ditanya dulu; fokus awal "Simpan dulu saja" (aman); Escape = tutup tanpa
  // menyimpan apa pun; fokus kembali ke tombol pemicu (APG Modal Dialog).
  // ==========================================================================
  var dialogTerbit = document.getElementById("dialog-terbit");
  var pilihanTerbit = null; // callback: (terbit: boolean) => void
  var pemicuDialog = null;  // elemen pemicu — fokus kembali saat dialog ditutup

  function bukaDialogTerbit(judul, cb, pemicu) {
    pilihanTerbit = cb;
    pemicuDialog = pemicu || null;
    var pratinjau = document.getElementById("pratinjau-terbit");
    if (pratinjau) pratinjau.textContent = "“" + judul + "” akan tampil di halaman Penyaluran.";
    if (dialogTerbit) dialogTerbit.hidden = false;
    var aman = document.getElementById("tombol-terbit-nanti");
    if (aman) aman.focus();
  }

  function tutupDialogTerbit() {
    if (dialogTerbit) dialogTerbit.hidden = true;
    pilihanTerbit = null;
    if (pemicuDialog && pemicuDialog.focus) pemicuDialog.focus();
    pemicuDialog = null;
  }

  var tombolTerbitNanti = document.getElementById("tombol-terbit-nanti");
  if (tombolTerbitNanti) {
    tombolTerbitNanti.addEventListener("click", function () {
      var cb = pilihanTerbit;
      tutupDialogTerbit();
      if (cb) cb(false); // "Simpan dulu saja" — tersimpan, tidak tampil publik
    });
  }

  var tombolTerbitYa = document.getElementById("tombol-terbit-ya");
  if (tombolTerbitYa) {
    tombolTerbitYa.addEventListener("click", function () {
      var cb = pilihanTerbit;
      tutupDialogTerbit();
      if (cb) cb(true); // "Ya, tampilkan" — terbit
    });
  }

  // ==========================================================================
  // R7: dialog konfirmasi sembunyikan — PATCH terbit=false (kontrak RLS F.2);
  // kabar tetap tersimpan; status di daftar jadi "Tersembunyi".
  // ==========================================================================
  var dialogSembunyi = document.getElementById("dialog-sembunyikan");
  var sembunyiTarget = null;

  function bukaDialogSembunyikan(k, pemicu) {
    sembunyiTarget = k;
    pemicuDialog = pemicu || null;
    var pratinjau = document.getElementById("pratinjau-sembunyikan");
    if (pratinjau) {
      pratinjau.textContent = "“" + k.judul + "” akan berhenti tampil di halaman Penyaluran. Kabar tetap tersimpan.";
    }
    if (dialogSembunyi) dialogSembunyi.hidden = false;
    var batal = document.getElementById("tombol-batal-sembunyikan");
    if (batal) batal.focus(); // fokus awal = Batal (aman)
  }

  function tutupDialogSembunyikan() {
    if (dialogSembunyi) dialogSembunyi.hidden = true;
    sembunyiTarget = null;
    if (pemicuDialog && pemicuDialog.focus) pemicuDialog.focus();
    pemicuDialog = null;
  }

  var tombolBatalSembunyi = document.getElementById("tombol-batal-sembunyikan");
  if (tombolBatalSembunyi) {
    tombolBatalSembunyi.addEventListener("click", tutupDialogSembunyikan);
  }

  var tombolYaSembunyi = document.getElementById("tombol-ya-sembunyikan");
  if (tombolYaSembunyi) {
    tombolYaSembunyi.addEventListener("click", function () {
      var k = sembunyiTarget;
      tutupDialogSembunyikan();
      if (!k) return;
      var token = tokenSesi();
      if (!token) return;
      minta("/rest/v1/kabar_penyaluran?id=eq." + k.id, {
        method: "PATCH", token: token, profil: true, isi: { terbit: false }
      }).then(function (r) {
        tolakJikaSesiMati(r);
        if (r.status >= 300) throw new Error("simpan-gagal");
        tampilBannerSukses("banner-sukses-kabar", [
          "✓ Tersimpan.",
          "“" + k.judul + "” disembunyikan dari situs."
        ], "penyaluran.html");
        muatDaftarKabar(); // R7: status daftar jadi "Tersembunyi"
      }).catch(function (e) {
        tanganiGalatSimpan(document.getElementById("pesan-kabar"), "kabar", e);
      });
    });
  }

  // APG Modal Dialog: Escape menutup dialog tanpa aksi; Tab terkurung di dalam
  // dialog (fokus tidak bisa keluar ke layar di belakang).
  var semuaDialog = [dialogSesi, dialogTerbit, dialogSembunyi];

  function dialogTerbuka() {
    for (var i = 0; i < semuaDialog.length; i++) {
      if (semuaDialog[i] && !semuaDialog[i].hidden) return semuaDialog[i];
    }
    return null;
  }

  function tutupDialogTerbuka() {
    if (dialogSesi && !dialogSesi.hidden) { tutupDialogSesi(); return; }
    if (dialogTerbit && !dialogTerbit.hidden) { tutupDialogTerbit(); return; }
    if (dialogSembunyi && !dialogSembunyi.hidden) { tutupDialogSembunyikan(); return; }
  }

  document.addEventListener("keydown", function (ev) {
    var d = dialogTerbuka();
    if (!d) return;
    if (ev.key === "Escape") {
      ev.preventDefault();
      tutupDialogTerbuka();
      return;
    }
    if (ev.key === "Tab") {
      var fokus = d.querySelectorAll("button, [href], input, select, textarea");
      if (!fokus.length) return;
      var pertama = fokus[0];
      var terakhir = fokus[fokus.length - 1];
      if (ev.shiftKey && document.activeElement === pertama) {
        ev.preventDefault();
        terakhir.focus();
      } else if (!ev.shiftKey && document.activeElement === terakhir) {
        ev.preventDefault();
        pertama.focus();
      }
    }
  });

  // --- Form 1: angka dana (+ riwayat, B5)
  var formAngka = document.getElementById("form-angka");
  var simpanAngkaBerjalan = false; // R5: tolak submit ganda (nol riwayat ganda)
  if (formAngka) {
    formAngka.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var token = tokenSesi();
      if (!token) return;
      if (muatGagal) return; // R2/K9: jangan simpan saat nilai lama gagal dimuat
      if (simpanAngkaBerjalan) return; // R5
      var pesan = document.getElementById("pesan-angka");
      var periode = document.getElementById("angka-periode").value.trim();
      var terkumpul = bacaAngkaKolom("angka-terkumpul-input");
      var tersalurkan = bacaAngkaKolom("angka-tersalurkan-input");
      var e1 = pesanKolomAngka("terkumpul", terkumpul);
      var e2 = pesanKolomAngka("tersalurkan", tersalurkan);
      // R14 (K12/4.1): periode kosong ditolak dengan pesan per kolom
      var ePeriode = periode ? "" : "Isi dulu periode, mis. 2026.";
      tampilGalatKolom("galat-periode", ePeriode);
      tampilGalatKolom("galat-terkumpul", e1);
      tampilGalatKolom("galat-tersalurkan", e2);
      if (ePeriode || e1 || e2) {
        var kolomSalah = document.getElementById(ePeriode ? "angka-periode" : (e1 ? "angka-terkumpul-input" : "angka-tersalurkan-input"));
        if (kolomSalah) kolomSalah.focus();
        return;
      }
      // R6 (H14): tersalurkan tidak boleh lebih besar dari terkumpul
      // (pesan verbatim UI 4.1; tampil di bawah kolom tersalurkan, W9).
      if (tersalurkan.nilai > terkumpul.nilai) {
        tampilGalatKolom("galat-tersalurkan", "Dana tersalurkan lebih besar dari yang terkumpul — periksa kembali.");
        document.getElementById("angka-tersalurkan-input").focus();
        return;
      }
      simpanAngkaBerjalan = true;
      aturTombolProses("tombol-simpan-angka", true); // R5: "Menyimpan…" + disabled
      var email = (bacaSesi() || {}).email || "admin";
      // baca nilai lama untuk riwayat (B5) & banner Sebelum -> Sesudah (R13)
      minta("/rest/v1/angka_dana?select=id,terkumpul,tersalurkan&aktif=eq.true&order=diubah_pada.desc&limit=1", { token: token, profil: true }).then(function (r) {
        var lama = (r.status === 200 && r.json.length) ? r.json[0] : null;
        var simpan = lama
          ? minta("/rest/v1/angka_dana?id=eq." + lama.id, {
              method: "PATCH", token: token, profil: true,
              isi: { periode: periode, terkumpul: terkumpul.nilai, tersalurkan: tersalurkan.nilai }
            })
          : minta("/rest/v1/angka_dana", {
              method: "POST", token: token, profil: true,
              isi: { periode: periode, terkumpul: terkumpul.nilai, tersalurkan: tersalurkan.nilai, aktif: true }
            });
        return simpan.then(function (sr) {
          tolakJikaSesiMati(sr); // R4: 401 = sesi mati -> dialog, isian tetap
          if (sr.status >= 300) throw new Error("simpan-gagal"); // server; nol kode HTTP (R3)
          // riwayat append-only (B5)
          return minta("/rest/v1/riwayat_angka", {
            method: "POST", token: token, profil: true,
            isi: {
              terkumpul_lama: lama ? lama.terkumpul : 0,
              terkumpul_baru: terkumpul.nilai,
              tersalurkan_lama: lama ? lama.tersalurkan : 0,
              tersalurkan_baru: tersalurkan.nilai,
              diubah_oleh: email
            }
          });
        }).then(function (rr) {
          tolakJikaSesiMati(rr);
          // R13 (K11): banner sukses bertahan + ringkasan Sebelum -> Sesudah
          // (angka bertitik ribuan, W15) + tautan "Lihat di situs" (tab baru).
          var baris = [
            "✓ Tersimpan.",
            "Terkumpul: " + formatAngka(lama ? lama.terkumpul : 0) + " → " + formatAngka(terkumpul.nilai),
            "Tersalurkan: " + formatAngka(lama ? lama.tersalurkan : 0) + " → " + formatAngka(tersalurkan.nilai)
          ];
          if (rr.status >= 300) baris.push("Angka tersimpan, tetapi riwayat gagal dicatat (hubungi teknisi).");
          tampilBannerSukses("banner-sukses-angka", baris, "index.html");
        });
      }).catch(function (e) {
        tanganiGalatSimpan(pesan, "angka", e); // R3/R4: jaringan/server/sesi mati
      }).then(function () {
        simpanAngkaBerjalan = false;
        aturTombolProses("tombol-simpan-angka", false);
      });
    });
  }

  // --- Form 2: kabar penyaluran (R8: dialog terbit; R7: mode Ubah; K7: tanggal hari ini)
  var formKabar = document.getElementById("form-kabar");
  var simpanKabarBerjalan = false; // R5: tolak submit ganda (nol kabar ganda)
  if (formKabar) {
    formKabar.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var token = tokenSesi();
      if (!token) return;
      if (simpanKabarBerjalan) return; // R5
      var judul = document.getElementById("kabar-judul").value.trim();
      var tanggal = nilaiTanggalKabar(); // R10: native ISO atau parse id-ID
      var tanggalKosong = !String(document.getElementById("kabar-tanggal").value || "").trim();
      var ringkasan = document.getElementById("kabar-ringkasan").value.trim();
      var urlFoto = document.getElementById("kabar-url-foto").value.trim();
      var tombol = document.getElementById("tombol-simpan-kabar");
      // R14 (K12/4.1): validasi aplikasi per kolom — fokus ke kolom pertama salah.
      tampilGalatKolom("galat-judul", "");
      tampilGalatKolom("galat-tanggal", "");
      tampilGalatKolom("galat-ringkasan", "");
      tampilGalatKolom("galat-foto", "");
      var galatPertama = null;
      if (!judul) {
        tampilGalatKolom("galat-judul", "Isi dulu judul kabar.");
        galatPertama = "kabar-judul";
      }
      if (tanggalKosong) {
        tampilGalatKolom("galat-tanggal", "Isi dulu tanggal kabar.");
        if (!galatPertama) galatPertama = "kabar-tanggal";
      } else if (!tanggal) {
        // R10 (matriks §4 no. 4, verbatim): fallback manual tak bisa dipahami
        tampilGalatKolom("galat-tanggal", "Tanggal tidak valid. Gunakan format 11 Agustus 2026.");
        if (!galatPertama) galatPertama = "kabar-tanggal";
      }
      if (!ringkasan) {
        tampilGalatKolom("galat-ringkasan", "Isi dulu ringkasan kabar.");
        if (!galatPertama) galatPertama = "kabar-ringkasan";
      }
      if (urlFoto && urlFoto.indexOf("https://") !== 0) {
        // R12 (K5/3.4, H10, verbatim): wajib https://
        tampilGalatKolom("galat-foto", "Alamat foto harus diawali https://. Salin alamat dari browser, lalu tempel.");
        if (!galatPertama) galatPertama = "kabar-url-foto";
      }
      if (galatPertama) {
        var kolomSalah = document.getElementById(galatPertama);
        if (kolomSalah) kolomSalah.focus();
        return;
      }
      // R8 (K6): kabar baru/tersembunyi -> ditanya dulu; kabar terbit -> simpan langsung.
      var perluKonfirmasi = !kabarEditId || !kabarEditTerbit;
      if (perluKonfirmasi) {
        bukaDialogTerbit(judul, function (terbit) {
          simpanKabar(token, judul, tanggal, ringkasan, urlFoto, terbit);
        }, tombol);
      } else {
        simpanKabar(token, judul, tanggal, ringkasan, urlFoto, true);
      }
    });
  }

  function simpanKabar(token, judul, tanggal, ringkasan, urlFoto, terbit) {
    simpanKabarBerjalan = true;
    aturTombolProses("tombol-simpan-kabar", true); // R5: "Menyimpan…" + disabled
    var pesan = document.getElementById("pesan-kabar");
    var permintaan = kabarEditId
      ? minta("/rest/v1/kabar_penyaluran?id=eq." + kabarEditId, {
          method: "PATCH", token: token, profil: true,
          isi: { judul: judul, tanggal: tanggal, ringkasan: ringkasan, url_foto: urlFoto || null, terbit: terbit }
        })
      : minta("/rest/v1/kabar_penyaluran", {
          method: "POST", token: token, profil: true,
          isi: { judul: judul, tanggal: tanggal, ringkasan: ringkasan, url_foto: urlFoto || null, terbit: terbit }
        });
    permintaan.then(function (r) {
      tolakJikaSesiMati(r); // R4: 401 = sesi mati -> dialog, isian tetap
      if (r.status >= 300) throw new Error("simpan-gagal"); // server; nol kode HTTP (R3)
      // R13 (K11): banner sukses bertahan + status terbit + Lihat di situs
      tampilBannerSukses("banner-sukses-kabar", [
        "✓ Tersimpan.",
        judul + (terbit ? " — tampil di situs." : " — tersimpan, belum tampil di situs.")
      ], "penyaluran.html");
      batalUbah(); // kembali ke mode tambah (tanggal = hari ini, K7)
      muatDaftarKabar(); // R7: daftar segar
    }).catch(function (e) {
      tanganiGalatSimpan(pesan, "kabar", e); // R3/R4: jaringan/server/sesi mati
    }).then(function () {
      simpanKabarBerjalan = false;
      aturTombolProses("tombol-simpan-kabar", false);
    });
  }

  // --- Form 3: kanal donasi + label
  var formDonasi = document.getElementById("form-donasi");
  if (formDonasi) {
    formDonasi.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var token = tokenSesi();
      if (!token) return;
      if (muatGagal) return; // R2/K9: jangan simpan saat nilai lama gagal dimuat
      var pesan = document.getElementById("pesan-donasi");
      // R14 (K12/4.1): kolom kosong ditolak dengan pesan per kolom
      var galatPertama = validasiKolom([
        { id: "donasi-kanal-input", galat: "galat-kanal-donasi", pesanKosong: "Isi dulu isi kanal donasi." },
        { id: "donasi-label-input", galat: "galat-label-donasi", pesanKosong: "Isi dulu label transparan." }
      ]);
      if (galatPertama) {
        document.getElementById(galatPertama).focus();
        return;
      }
      var isi = {
        donasi_kanal: document.getElementById("donasi-kanal-input").value.trim(),
        donasi_label: document.getElementById("donasi-label-input").value.trim()
      };
      simpanKonten(isi, token, pesan, "tombol-simpan-donasi", "banner-sukses-donasi",
        "donasi", "donasi.html", "Isi halaman Donasi diperbarui.");
    });
  }

  // --- Form 4: konten Tentang
  var formTentang = document.getElementById("form-tentang");
  if (formTentang) {
    formTentang.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var token = tokenSesi();
      if (!token) return;
      if (muatGagal) return; // R2/K9: jangan simpan saat nilai lama gagal dimuat
      var pesan = document.getElementById("pesan-tentang");
      // R14 (K12/4.1): kolom kosong ditolak dengan pesan per kolom
      var galatPertama = validasiKolom([
        { id: "tentang-profil-input", galat: "galat-tentang-profil", pesanKosong: "Isi dulu profil lembaga." },
        { id: "tentang-legalitas-input", galat: "galat-tentang-legalitas", pesanKosong: "Isi dulu status legalitas." },
        { id: "tentang-pengurus-input", galat: "galat-tentang-pengurus", pesanKosong: "Isi dulu struktur pengurus." },
        { id: "kontak-resmi-input", galat: "galat-kontak-resmi", pesanKosong: "Isi dulu kontak resmi." }
      ]);
      if (galatPertama) {
        document.getElementById(galatPertama).focus();
        return;
      }
      var isi = {
        tentang_profil: document.getElementById("tentang-profil-input").value.trim(),
        tentang_legalitas: document.getElementById("tentang-legalitas-input").value.trim(),
        tentang_pengurus: document.getElementById("tentang-pengurus-input").value.trim(),
        kontak_resmi: document.getElementById("kontak-resmi-input").value.trim()
      };
      simpanKonten(isi, token, pesan, "tombol-simpan-tentang", "banner-sukses-tentang",
        "konten Tentang", "tentang.html", "Isi halaman Tentang diperbarui.");
    });
  }

  var prosesKonten = false; // R5: tolak submit ganda donasi/tentang

  // R3/R4/R5/R13: guard + loading + pesan jaringan/server/sesi + banner sukses.
  function simpanKonten(isi, token, pesan, idTombol, bannerId, objek, tautanSitus, suksesTeks) {
    if (prosesKonten) return; // R5
    prosesKonten = true;
    aturTombolProses(idTombol, true); // R5: "Menyimpan…" + disabled
    var kunci = Object.keys(isi);
    var rantai = Promise.resolve();
    kunci.forEach(function (k) {
      rantai = rantai.then(function () {
        return minta("/rest/v1/konten_halaman?kunci=eq." + encodeURIComponent(k), {
          method: "PATCH", token: token, profil: true, isi: { nilai: isi[k] }
        }).then(function (r) {
          tolakJikaSesiMati(r); // R4: 401 = sesi mati -> dialog, isian tetap
          if (r.status >= 300 && r.status !== 404) throw new Error("simpan-gagal");
          if (r.status === 404) {
            return minta("/rest/v1/konten_halaman", {
              method: "POST", token: token, profil: true,
              isi: { kunci: k, nilai: isi[k] }
            }).then(function (r2) {
              tolakJikaSesiMati(r2);
              if (r2.status >= 300) throw new Error("simpan-gagal");
            });
          }
        });
      });
    });
    rantai.then(function () {
      // R13 (K11): banner sukses bertahan + tautan "Lihat di situs" (tab baru)
      tampilBannerSukses(bannerId, ["✓ Tersimpan. " + suksesTeks], tautanSitus);
    }).catch(function (e) {
      tanganiGalatSimpan(pesan, objek, e); // R3/R4: jaringan/server/sesi mati
    }).then(function () {
      prosesKonten = false;
      aturTombolProses(idTombol, false);
    });
  }

  // --- K7/R10: tanggal kabar bernilai awal hari ini (native atau fallback teks)
  pasangModeTanggal();
  var tanggalKabar = document.getElementById("kabar-tanggal");
  if (tanggalKabar && !tanggalKabar.value) tampilTanggalKabar(hariIni());

  // --- Restorasi sesi: bila token tersimpan, langsung tampilkan admin
  var sesi = bacaSesi();
  if (sesi && sesi.token) {
    tampilkanAdmin(sesi.email || "admin", sesi.token);
  }
})();
