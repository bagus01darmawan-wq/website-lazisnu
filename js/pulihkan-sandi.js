// Pemulihan sandi admin (TQ-O3/B10 — perbaikan T12 2026-08-12).
// Email reset Supabase membawa tautan ke SITE_URL dengan hash
// #access_token=...&type=recovery (default template). Tanpa library: token dari
// hash dipakai langsung untuk PUT /auth/v1/user {password} — ganti sandi, lalu
// arahkan ke halaman admin. Hanya aktif bila hash memuat type=recovery.
(function () {
  "use strict";

  var cfg = window.LAZISNU_CONFIG;
  if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    return; // config.js belum dihasilkan
  }

  var param = {};
  try {
    var h = location.hash.replace(/^#/, "");
    h.split("&").forEach(function (b) {
      var i = b.indexOf("=");
      if (i > 0) param[b.slice(0, i)] = decodeURIComponent(b.slice(i + 1));
    });
  } catch (e) { return; }

  if (param.type !== "recovery" || !param.access_token) return; // bukan mode pemulihan

  var seksi = document.getElementById("pulihkan-sandi");
  if (!seksi) return;
  seksi.hidden = false;
  var kolomBaru = document.getElementById("sandi-baru");
  if (kolomBaru) kolomBaru.focus();

  var URL = cfg.SUPABASE_URL.replace(/\/+$/, "");
  var tombol = document.getElementById("tombol-simpan-sandi");
  var pesan = document.getElementById("pesan-pulihkan");
  var sibuk = false;

  function beriPesan(teks, gagal) {
    if (pesan) {
      pesan.textContent = teks;
      pesan.className = gagal ? "galat" : "catatan";
    }
  }

  function bersihkanHash() {
    try { history.replaceState(null, "", location.pathname); } catch (e) { location.hash = ""; }
  }

  if (tombol) {
    tombol.addEventListener("click", function () {
      if (sibuk) return;
      var baru = document.getElementById("sandi-baru").value;
      var ulang = document.getElementById("sandi-baru-ulang").value;
      if (!baru) {
        beriPesan("Isi dulu sandi baru.", true);
        if (kolomBaru) kolomBaru.focus();
        return;
      }
      if (baru.length < 6) {
        beriPesan("Sandi baru minimal 6 karakter.", true);
        if (kolomBaru) kolomBaru.focus();
        return;
      }
      if (baru !== ulang) {
        beriPesan("Sandi baru tidak sama dengan ulangan.", true);
        var kolomUlang = document.getElementById("sandi-baru-ulang");
        if (kolomUlang) kolomUlang.focus();
        return;
      }
      sibuk = true;
      tombol.disabled = true;
      tombol.textContent = "Menyimpan…";
      beriPesan("Menyimpan sandi baru…", false);
      fetch(URL + "/auth/v1/user", {
        method: "PUT",
        headers: {
          apikey: cfg.SUPABASE_ANON_KEY,
          Authorization: "Bearer " + param.access_token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password: baru })
      }).then(function (r) {
        if (r.status === 200) {
          bersihkanHash();
          var sukses = document.createElement("p");
          sukses.className = "banner-sukses";
          sukses.textContent = "Sandi baru tersimpan. ";
          var a = document.createElement("a");
          a.href = "admin.html";
          a.textContent = "Masuk ke panel admin";
          sukses.appendChild(a);
          seksi.parentNode.insertBefore(sukses, seksi);
          seksi.hidden = true;
          return;
        }
        if (r.status === 401) {
          beriPesan("Tautan sudah kedaluwarsa. Minta tautan baru lewat halaman Admin → Lupa kata sandi?.", true);
          return;
        }
        beriPesan("Gagal menyimpan sandi. Coba sekali lagi; bila tetap gagal, hubungi teknisi.", true);
      }).catch(function () {
        beriPesan("Tidak bisa menyimpan — periksa koneksi internet, lalu coba lagi.", true);
      }).then(function () {
        sibuk = false;
        tombol.disabled = false;
        tombol.textContent = "Simpan Sandi Baru";
      });
    });
  }
})();
