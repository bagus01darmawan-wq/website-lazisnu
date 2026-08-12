// Data dari database (T7 kabar penyaluran, T9 panel angka) — baca-saja
// via anon key + RLS (schema lazisnu, kontrak desain F.2).
// Dijalankan pada halaman yang memiliki elemen terkait (index, penyaluran).
(function () {
  "use strict";

  var cfg = window.LAZISNU_CONFIG;
  if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    return; // config.js belum dihasilkan (mis. dibuka langsung dari repo tanpa generate)
  }

  function ambil(path, params) {
    var qs = new URLSearchParams(params).toString();
    return fetch(cfg.SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/" + path + "?" + qs, {
      headers: {
        apikey: cfg.SUPABASE_ANON_KEY,
        Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY,
        "Accept-Profile": "lazisnu"
      }
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function rupiah(n) {
    try {
      return "Rp " + new Intl.NumberFormat("id-ID").format(n);
    } catch (e) {
      return String(n);
    }
  }

  // T9 — panel angka beranda (AC-05/06, ambang B11: ≤ 60 detik dari admin menyimpan)
  var angkaTerkumpul = document.getElementById("angka-terkumpul");
  var angkaTersalurkan = document.getElementById("angka-tersalurkan");
  var catatan = document.getElementById("catatan-terakhir");
  if (angkaTerkumpul && angkaTersalurkan) {
    ambil("angka_dana", {
      select: "periode,terkumpul,tersalurkan,diubah_pada",
      aktif: "eq.true",
      order: "diubah_pada.desc",
      limit: "1"
    }).then(function (baris) {
      if (!baris || baris.length === 0) {
        if (catatan) catatan.textContent = "Belum ada angka yang diterbitkan.";
        return;
      }
      var b = baris[0];
      angkaTerkumpul.textContent = rupiah(b.terkumpul);
      angkaTersalurkan.textContent = rupiah(b.tersalurkan);
      if (catatan) {
        try {
          catatan.textContent = "Periode " + b.periode + " — terakhir diperbarui " +
            new Date(b.diubah_pada).toLocaleString("id-ID");
        } catch (e) {
          catatan.textContent = "Periode " + b.periode;
        }
      }
    }).catch(function () {
      if (catatan) catatan.textContent = "Data tidak tersedia saat ini — coba muat ulang sebentar lagi.";
    });
  }

  // T7 — daftar kabar penyaluran (AC-03)
  var daftarKabar = document.getElementById("daftar-kabar");
  if (daftarKabar) {
    ambil("kabar_penyaluran", {
      select: "judul,tanggal,ringkasan,url_foto",
      terbit: "eq.true",
      order: "tanggal.desc"
    }).then(function (baris) {
      if (!baris || baris.length === 0) {
        daftarKabar.textContent = "Belum ada kabar yang diterbitkan.";
        return;
      }
      daftarKabar.textContent = "";
      baris.forEach(function (k) {
        var artikel = document.createElement("article");
        artikel.className = "kabar";

        var judul = document.createElement("h2");
        judul.textContent = k.judul;
        artikel.appendChild(judul);

        var waktu = document.createElement("p");
        waktu.className = "catatan";
        try {
          waktu.textContent = new Date(k.tanggal + "T00:00:00").toLocaleDateString("id-ID", {
            year: "numeric", month: "long", day: "numeric"
          });
        } catch (e) {
          waktu.textContent = k.tanggal;
        }
        artikel.appendChild(waktu);

        if (k.url_foto) {
          var img = document.createElement("img");
          img.src = k.url_foto;
          img.alt = "";
          img.className = "foto-kabar";
          // Perbaikan T12 (2026-08-12): alamat bukan gambar langsung (temuan nyata)
          // → jangan tampilkan ikon pecah; sembunyikan + catatan kecil.
          img.onerror = function () {
            img.style.display = "none";
            var catatan = document.createElement("p");
            catatan.className = "catatan";
            catatan.textContent = "Foto tidak tampil.";
            artikel.insertBefore(catatan, ringkas);
          };
          artikel.appendChild(img);
        }

        var ringkas = document.createElement("p");
        ringkas.textContent = k.ringkasan;
        artikel.appendChild(ringkas);

        daftarKabar.appendChild(artikel);
      });
    }).catch(function () {
      daftarKabar.textContent = "Kabar tidak tersedia saat ini — coba muat ulang sebentar lagi.";
    });
  }
})();
