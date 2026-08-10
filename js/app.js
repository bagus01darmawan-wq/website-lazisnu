// Perilaku kecil bersama — kerangka B0 (T1). Night mode: T2.
(function () {
  "use strict";

  // Tahun berjalan di footer (semua halaman).
  var tahun = document.getElementById("tahun-kini");
  if (tahun) {
    tahun.textContent = String(new Date().getFullYear());
  }
})();
