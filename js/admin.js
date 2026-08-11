// Admin (T8): login Supabase Auth (password grant), 4 form kecil, lupa sandi (B10), keluar.
// Tanpa library: fetch murni ke REST Supabase (Auth + PostgREST, schema lazisnu, RLS kontrak F.2).
// Aturan keras C: hanya anon key + login admin; service_role tidak pernah dipakai.
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

  // Escape menutup dialog tanpa aksi (APG Modal Dialog).
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && dialogSesi && !dialogSesi.hidden) tutupDialogSesi();
  });

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
      tampilGalatKolom("galat-terkumpul", e1);
      tampilGalatKolom("galat-tersalurkan", e2);
      if (e1 || e2) {
        var kolomSalah = document.getElementById(e1 ? "angka-terkumpul-input" : "angka-tersalurkan-input");
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

  // --- Form 2: kabar penyaluran
  var formKabar = document.getElementById("form-kabar");
  var simpanKabarBerjalan = false; // R5: tolak submit ganda (nol kabar ganda)
  if (formKabar) {
    formKabar.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var token = tokenSesi();
      if (!token) return;
      if (simpanKabarBerjalan) return; // R5
      var pesan = document.getElementById("pesan-kabar");
      var urlFoto = document.getElementById("kabar-url-foto").value.trim();
      var judul = document.getElementById("kabar-judul").value.trim();
      var terbit = document.getElementById("kabar-terbit").checked;
      simpanKabarBerjalan = true;
      aturTombolProses("tombol-simpan-kabar", true); // R5: "Menyimpan…" + disabled
      minta("/rest/v1/kabar_penyaluran", {
        method: "POST", token: token, profil: true,
        isi: {
          judul: judul,
          tanggal: document.getElementById("kabar-tanggal").value,
          ringkasan: document.getElementById("kabar-ringkasan").value.trim(),
          url_foto: urlFoto || null,
          terbit: terbit
        }
      }).then(function (r) {
        tolakJikaSesiMati(r); // R4: 401 = sesi mati -> dialog, isian tetap
        if (r.status >= 300) throw new Error("simpan-gagal"); // server; nol kode HTTP (R3)
        // R13 (K11): banner sukses bertahan + status terbit + Lihat di situs
        tampilBannerSukses("banner-sukses-kabar", [
          "✓ Tersimpan.",
          judul + (terbit ? " — tampil di situs." : " — tersimpan, belum tampil di situs.")
        ], "penyaluran.html");
        formKabar.reset();
        document.getElementById("kabar-terbit").checked = true;
      }).catch(function (e) {
        tanganiGalatSimpan(pesan, "kabar", e); // R3/R4: jaringan/server/sesi mati
      }).then(function () {
        simpanKabarBerjalan = false;
        aturTombolProses("tombol-simpan-kabar", false);
      });
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

  // --- Restorasi sesi: bila token tersimpan, langsung tampilkan admin
  var sesi = bacaSesi();
  if (sesi && sesi.token) {
    tampilkanAdmin(sesi.email || "admin", sesi.token);
  }
})();
