// TEMPLATE konfigurasi data — dihasilkan oleh scripts/generate-konten.js menjadi js/config.js
// (gitignored). JANGAN commit nilai asli: kunci diambil dari env/.env saat build.
// Anon key memang kunci publik (RLS mengunci tulis) — namun tetap tidak pernah masuk commit.
window.LAZISNU_CONFIG = {
  SUPABASE_URL: "{{SUPABASE_URL}}",
  SUPABASE_ANON_KEY: "{{SUPABASE_ANON_KEY}}"
};
