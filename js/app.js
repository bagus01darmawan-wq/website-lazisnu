// Perilaku kecil bersama — T1 (tahun footer) + T2 (night mode, AC-07/B8).
(function () {
  "use strict";

  // Tahun berjalan di footer (semua halaman).
  var tahun = document.getElementById("tahun-kini");
  if (tahun) {
    tahun.textContent = String(new Date().getFullYear());
  }

  // Night mode (AC-07, B8): tombol di header; pilihan tersimpan di perangkat (localStorage).
  var akar = document.documentElement;
  var tombol = document.getElementById("tombol-tema");
  var KUNCI = "lazisnu-tema";

  function terapkan(gelap) {
    akar.setAttribute("data-tema", gelap ? "gelap" : "terang");
    if (tombol) {
      tombol.setAttribute("aria-pressed", String(gelap));
      // W3/W17 (paket desain 2026-08-12): tombol teks "Gelap"/"Terang" — tanpa ikon
      tombol.textContent = gelap ? "Terang" : "Gelap";
    }
  }

  var tersimpan = null;
  try {
    tersimpan = localStorage.getItem(KUNCI);
  } catch (e) {
    /* penyimpanan tak tersedia (mode privat): abaikan */
  }
  var awal = tersimpan !== null
    ? tersimpan === "gelap"
    : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  terapkan(awal);

  if (tombol) {
    tombol.addEventListener("click", function () {
      var gelap = akar.getAttribute("data-tema") !== "gelap";
      terapkan(gelap);
      try {
        localStorage.setItem(KUNCI, gelap ? "gelap" : "terang");
      } catch (e) {
        /* abaikan */
      }
    });
  }
})();
