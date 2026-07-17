const { createApp } = require("../lib/app");

// Entry point Vercel. Vercel manggil export ini langsung sebagai request handler,
// jadi ga ada app.listen() di sini, beda sama server.js yang buat local/VPS.
module.exports = createApp();
