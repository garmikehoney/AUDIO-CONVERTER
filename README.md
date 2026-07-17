# Audio Speed + Bass Converter

Web app buat convert audio jadi versi sped up + bass boosted, 3 preset: 2.3x (~4dB), 2.5x (~6dB), 2.7x (~8dB).

Bisa dijalanin dua cara: local/VPS biasa (`npm start`), atau di-deploy ke Vercel.

## Jalan di local/VPS

```
npm install
npm start
```

Buka `http://localhost:3000`. Upload langsung dibatasi 50MB, paste-link juga 50MB.

## Deploy ke Vercel

Cara paling gampang (ga perlu install apa-apa di komputer):

1. Push folder ini ke repo GitHub baru.
2. Buka [vercel.com](https://vercel.com), sign in pakai akun GitHub.
3. "Add New Project" -> pilih repo tadi -> klik Deploy. Ga perlu ubah setting apapun, `vercel.json` udah ngatur semuanya.
4. Selesai, Vercel kasih URL publik buat langsung dipakai.

Yang beda dari deploy ke Vercel (otomatis, ga perlu diatur manual):

- Upload file langsung dibatasi jadi 4MB, karena itu limit platform Vercel buat ukuran request (di luar kendali kita). Kalau file lebih besar dari itu, pakai fitur paste-link — itu didownload sendiri sama server, jadi tetap bisa sampai 50MB.
- Konversi dikasih waktu maks 60 detik per request (`maxDuration` di `vercel.json`). Kalau butuh lebih lama (misal expect banyak file gede lewat link), naikin angkanya di situ, atau upgrade ke Vercel Pro buat headroom lebih besar.

## Cara kerja

- Speed pakai teknik `asetrate` (bukan `atempo`), jadi pitch ikut naik bareng speed — ini yang bikin efek "sped up" khas, beda sama time-stretch yang mempertahankan pitch.
- Bass boost pakai filter `bass` ffmpeg (`g=<dB>`).
- Backend pakai `ffmpeg-static`/`ffprobe-static` (binary udah kebundle, ga perlu install ffmpeg manual). Kalau paket itu gagal load di platform tertentu, otomatis fallback ke `ffmpeg`/`ffprobe` yang ada di PATH sistem.
- Input bisa upload file atau paste direct link ke file audio. Bukan link YouTube/platform streaming — itu di luar scope karena melanggar ToS mereka.
- Validasi file audio dicek dari isi file (ffprobe), bukan dari Content-Type yang dikirim client, karena itu gampang salah/dipalsukan.
- Semua temp file (upload & hasil convert) ditulis ke temp dir OS dan dihapus otomatis setelah request selesai. Ini sengaja dipilih (bukan folder custom di dalam project) supaya kode yang sama jalan baik di local/VPS maupun di Vercel, yang cuma ngasih `/tmp` sebagai satu-satunya folder writable.

## Struktur

```
server.js               entry point local/VPS (app.listen)
api/index.js             entry point Vercel (export app, tanpa listen)
lib/app.js               setup Express app, dipakai bareng sama dua entry point di atas
routes/convert.js        route handler POST /api/convert
services/audioConverter.js   logic ffmpeg (probe + convert)
services/sourceResolver.js   resolve input dari upload/link
config/presets.js        definisi 3 preset
vercel.json              config Vercel (maxDuration, include binary ffmpeg)
public/                  frontend (upload/link, pilih preset, auto-download)
```

## Batasan

- Local/VPS: max ukuran file 50MB (upload maupun dari link).
- Vercel: upload langsung maks 4MB, paste-link tetap 50MB.
- Link harus direct link ke file audio (http/https), bukan halaman streaming.
