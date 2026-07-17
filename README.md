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

1. Push folder ini ke repo GitHub.
2. Buka vercel.com, sign in pakai akun GitHub.
3. "Add New Project" -> pilih repo -> Deploy. `vercel.json` udah ngatur semuanya.

Yang beda otomatis di Vercel:

- Upload langsung dibatasi 4MB (limit platform Vercel buat ukuran request). File lebih besar pakai paste-link, itu didownload sendiri sama server jadi tetap sampai 50MB.
- Konversi dikasih waktu maks 60 detik (`maxDuration` di `vercel.json`).

## Troubleshooting

Kalau upload gagal dengan pesan "File yang diupload bukan file audio yang valid" padahal file-nya jelas audio, cek **Vercel dashboard -> Deployments -> klik deployment -> Runtime Logs / Functions**. Cari baris:

```
[audio-converter] pakai ffmpeg: ...
[audio-converter] pakai ffprobe: ...
```

Kalau ada baris `ffprobe gagal buat ...` sesudahnya, itu nunjukkin kenapa gagal (binary ga ketemu, permission, dll) — kirim baris itu buat didiagnosa lebih lanjut.

## Cara kerja

- Speed pakai teknik `asetrate` (bukan `atempo`), jadi pitch ikut naik bareng speed.
- Bass boost pakai filter `bass` ffmpeg (`g=<dB>`).
- Backend pakai `ffmpeg-static`/`ffprobe-static`, fallback ke ffmpeg/ffprobe sistem kalau ga ke-load.
- Validasi file audio dicek dari isi file (ffprobe), bukan Content-Type dari client.
- Temp file ditulis ke temp dir OS (`/tmp` di Vercel) dan dihapus otomatis abis request.

## Struktur

```
server.js               entry point local/VPS
api/index.js             entry point Vercel
lib/app.js               setup Express app (dipakai dua entry point)
routes/convert.js        route handler POST /api/convert
services/audioConverter.js   logic ffmpeg
services/sourceResolver.js   resolve input dari upload/link
config/presets.js        definisi 3 preset
vercel.json              config Vercel
public/                  frontend
```
