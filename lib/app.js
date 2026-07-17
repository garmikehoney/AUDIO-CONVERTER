const path = require("path");
const express = require("express");
const multer = require("multer");

const convertRoute = require("../routes/convert");
const { HttpError } = require("../services/sourceResolver");

// Dipakai bareng sama dua entry point: server.js (local/VPS, panggil app.listen)
// dan api/index.js (Vercel, export app-nya langsung tanpa listen).
function createApp() {
  const app = express();

  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use("/api", convertRoute);

  // Error handler terpusat. HttpError (validasi input dari kita sendiri) dipetakan
  // ke status yang bener. MulterError dicek terpisah karena dia bukan HttpError tapi
  // tetap kesalahan yang jelas (misal file kelewat batas ukuran), bukan bug server.
  // Sisanya dianggap 500 dan di-log biar bisa ditelusuri, ga di-swallow diam-diam.
  app.use((err, req, res, next) => {
    if (err instanceof HttpError || err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          error: "File kebesaran buat upload langsung. Coba fitur paste-link buat file yang lebih besar.",
        });
      }
      return res.status(400).json({ error: `Upload gagal: ${err.message}` });
    }
    console.error("[audio-converter] unexpected error:", err);
    res.status(500).json({ error: "Gagal proses audio di server." });
  });

  return app;
}

module.exports = { createApp };
