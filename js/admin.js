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
  function muatNilaiSekarang(token) {
    minta("/rest/v1/konten_halaman?select=kunci,nilai", { token: token, profil: true }).then(function (r) {
      if (r.status !== 200) return;
      var isi = {};
      r.json.forEach(function (b) { isi[b.kunci] = b.nilai; });
      if (document.getElementById("donasi-kanal-input")) document.getElementById("donasi-kanal-input").value = isi.donasi_kanal || "";
      if (document.getElementById("donasi-label-input")) document.getElementById("donasi-label-input").value = isi.donasi_label || "";
      if (document.getElementById("tentang-profil-input")) document.getElementById("tentang-profil-input").value = isi.tentang_profil || "";
      if (document.getElementById("tentang-legalitas-input")) document.getElementById("tentang-legalitas-input").value = isi.tentang_legalitas || "";
      if (document.getElementById("tentang-pengurus-input")) document.getElementById("tentang-pengurus-input").value = isi.tentang_pengurus || "";
      if (document.getElementById("kontak-resmi-input")) document.getElementById("kontak-resmi-input").value = isi.kontak_resmi || "";
    });
    minta("/rest/v1/angka_dana?select=id,periode,terkumpul,tersalurkan&aktif=eq.true&order=diubah_pada.desc&limit=1", { token: token, profil: true }).then(function (r) {
      if (r.status !== 200 || !r.json.length) return;
      var a = r.json[0];
      if (document.getElementById("angka-periode")) document.getElementById("angka-periode").value = a.periode || "";
      if (document.getElementById("angka-terkumpul-input")) document.getElementById("angka-terkumpul-input").value = a.terkumpul != null ? a.terkumpul : "";
      if (document.getElementById("angka-tersalurkan-input")) document.getElementById("angka-tersalurkan-input").value = a.tersalurkan != null ? a.tersalurkan : "";
    });
  }

  function validasiAngka(n) {
    if (!(n > 0)) return "Angka harus lebih dari 0.";
    if (n > BATAS_ANGKA) return "Angka terlalu besar (maksimal 100 triliun) — periksa kembali.";
    return null;
  }

  // --- Form 1: angka dana (+ riwayat, B5)
  var formAngka = document.getElementById("form-angka");
  if (formAngka) {
    formAngka.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var token = tokenSesi();
      if (!token) return;
      var pesan = document.getElementById("pesan-angka");
      var periode = document.getElementById("angka-periode").value.trim();
      var terkumpul = Number(document.getElementById("angka-terkumpul-input").value);
      var tersalurkan = Number(document.getElementById("angka-tersalurkan-input").value);
      var err = validasiAngka(terkumpul) || validasiAngka(tersalurkan);
      if (err) { pesan.textContent = err; return; }
      var email = (bacaSesi() || {}).email || "admin";
      // baca nilai lama untuk riwayat
      minta("/rest/v1/angka_dana?select=id,terkumpul,tersalurkan&aktif=eq.true&order=diubah_pada.desc&limit=1", { token: token, profil: true }).then(function (r) {
        var lama = (r.status === 200 && r.json.length) ? r.json[0] : null;
        var simpan = lama
          ? minta("/rest/v1/angka_dana?id=eq." + lama.id, {
              method: "PATCH", token: token, profil: true,
              isi: { periode: periode, terkumpul: terkumpul, tersalurkan: tersalurkan }
            })
          : minta("/rest/v1/angka_dana", {
              method: "POST", token: token, profil: true,
              isi: { periode: periode, terkumpul: terkumpul, tersalurkan: tersalurkan, aktif: true }
            });
        return simpan.then(function (sr) {
          if (sr.status >= 300) throw new Error("HTTP " + sr.status);
          // riwayat append-only (B5)
          return minta("/rest/v1/riwayat_angka", {
            method: "POST", token: token, profil: true,
            isi: {
              terkumpul_lama: lama ? lama.terkumpul : 0,
              terkumpul_baru: terkumpul,
              tersalurkan_lama: lama ? lama.tersalurkan : 0,
              tersalurkan_baru: tersalurkan,
              diubah_oleh: email
            }
          });
        }).then(function (rr) {
          pesan.textContent = rr.status < 300 ? "Angka tersimpan — situs akan menampilkan nilainya dalam ≤ 60 detik." : "Angka tersimpan, tetapi riwayat gagal dicatat (hubungi teknisi).";
        });
      }).catch(function () {
        pesan.textContent = "Gagal menyimpan — periksa koneksi lalu coba lagi.";
      });
    });
  }

  // --- Form 2: kabar penyaluran
  var formKabar = document.getElementById("form-kabar");
  if (formKabar) {
    formKabar.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var token = tokenSesi();
      if (!token) return;
      var pesan = document.getElementById("pesan-kabar");
      var urlFoto = document.getElementById("kabar-url-foto").value.trim();
      minta("/rest/v1/kabar_penyaluran", {
        method: "POST", token: token, profil: true,
        isi: {
          judul: document.getElementById("kabar-judul").value.trim(),
          tanggal: document.getElementById("kabar-tanggal").value,
          ringkasan: document.getElementById("kabar-ringkasan").value.trim(),
          url_foto: urlFoto || null,
          terbit: document.getElementById("kabar-terbit").checked
        }
      }).then(function (r) {
        if (r.status < 300) {
          pesan.textContent = "Kabar tersimpan.";
          formKabar.reset();
          document.getElementById("kabar-terbit").checked = true;
        } else {
          pesan.textContent = "Gagal menyimpan kabar (HTTP " + r.status + ").";
        }
      }).catch(function () {
        pesan.textContent = "Gagal terhubung — coba lagi.";
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
      var pesan = document.getElementById("pesan-donasi");
      var isi = {
        donasi_kanal: document.getElementById("donasi-kanal-input").value.trim(),
        donasi_label: document.getElementById("donasi-label-input").value.trim()
      };
      simpanKonten(isi, token, pesan, "Konten donasi tersimpan.");
    });
  }

  // --- Form 4: konten Tentang
  var formTentang = document.getElementById("form-tentang");
  if (formTentang) {
    formTentang.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var token = tokenSesi();
      if (!token) return;
      var pesan = document.getElementById("pesan-tentang");
      var isi = {
        tentang_profil: document.getElementById("tentang-profil-input").value.trim(),
        tentang_legalitas: document.getElementById("tentang-legalitas-input").value.trim(),
        tentang_pengurus: document.getElementById("tentang-pengurus-input").value.trim(),
        kontak_resmi: document.getElementById("kontak-resmi-input").value.trim()
      };
      simpanKonten(isi, token, pesan, "Konten Tentang tersimpan.");
    });
  }

  function simpanKonten(isi, token, pesan, suksesTeks) {
    var kunci = Object.keys(isi);
    var rantai = Promise.resolve();
    kunci.forEach(function (k) {
      rantai = rantai.then(function () {
        return minta("/rest/v1/konten_halaman?kunci=eq." + encodeURIComponent(k), {
          method: "PATCH", token: token, profil: true, isi: { nilai: isi[k] }
        }).then(function (r) {
          if (r.status >= 300 && r.status !== 404) throw new Error("HTTP " + r.status);
          if (r.status === 404) {
            return minta("/rest/v1/konten_halaman", {
              method: "POST", token: token, profil: true,
              isi: { kunci: k, nilai: isi[k] }
            }).then(function (r2) {
              if (r2.status >= 300) throw new Error("HTTP " + r2.status);
            });
          }
        });
      });
    });
    rantai.then(function () { pesan.textContent = suksesTeks; })
      .catch(function (e) { pesan.textContent = "Gagal menyimpan (" + e.message + ")."; });
  }

  // --- Restorasi sesi: bila token tersimpan, langsung tampilkan admin
  var sesi = bacaSesi();
  if (sesi && sesi.token) {
    tampilkanAdmin(sesi.email || "admin", sesi.token);
  }
})();
