const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

// ffmpeg-static/ffprobe-static bundle binaries per-platform. Kalau binary buat platform ini
// ga ada (install kepotong, atau paket ga support platform tertentu), fallback ke ffmpeg/ffprobe
// yang ada di PATH sistem. Di local/VPS itu jaring pengaman yang berguna, tapi di Vercel ga ada
// system ffmpeg sama sekali jadi fallback itu ga akan nolong di sana.
function resolveBinary(pkgName, systemFallback) {
  try {
    const resolved = require(pkgName);
    const binPath = typeof resolved === "string" ? resolved : resolved.path;
    if (binPath && fs.existsSync(binPath)) {
      // Beberapa platform deploy (Vercel salah satunya) suka ngilangin execute bit pas
      // ngebundle function, biarpun binary-nya kebawa. Pasang lagi biar bisa dieksekusi.
      try {
        fs.chmodSync(binPath, 0o755);
      } catch (chmodErr) {
        console.warn(`[audio-converter] gagal chmod ${binPath}:`, chmodErr.message);
      }
      return binPath;
    }
  } catch {
    // paket ga ke-load / platform ga ke-cover, lanjut ke fallback
  }
  return systemFallback;
}

const ffmpegPath = resolveBinary("ffmpeg-static", "ffmpeg");
const ffprobePath = resolveBinary("ffprobe-static", "ffprobe");
console.log(`[audio-converter] pakai ffmpeg: ${ffmpegPath}`);
console.log(`[audio-converter] pakai ffprobe: ${ffprobePath}`);

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// Cek isi file beneran ada audio stream-nya atau ngga. Ini validasi yang dipakai,
// bukan Content-Type dari client, karena itu gampang dipalsuin / sering salah.
// Error asli dari ffprobe di-log (bukan ditelan diam-diam) biar kalau ternyata bukan
// soal "file bukan audio" tapi soal binary/permission, itu ketauan dari log server.
function probeAudioInfo(filePath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) {
        console.error(`[audio-converter] ffprobe gagal buat ${filePath}:`, err.message);
        return resolve(null);
      }
      const audioStream = data.streams.find((s) => s.codec_type === "audio");
      if (!audioStream) return resolve(null);
      const rate = parseInt(audioStream.sample_rate, 10);
      resolve({ sampleRate: Number.isFinite(rate) && rate > 0 ? rate : 44100 });
    });
  });
}

async function probeSampleRate(filePath) {
  const info = await probeAudioInfo(filePath);
  return info ? info.sampleRate : 44100;
}

// Convert satu file audio pakai preset (speed + bass boost), tulis hasil ke outputPath.
// speed di sini pakai asetrate (bukan atempo) supaya pitch ikut naik bareng speed,
// itu yang bikin efek "sped up" khas, bukan time-stretch yang mempertahankan pitch.
async function convertAudio({ inputPath, outputPath, speed, bassGain }) {
  const sourceRate = await probeSampleRate(inputPath);
  const targetRate = Math.round(sourceRate * speed);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFilters([
        { filter: "asetrate", options: `${targetRate}` },
        { filter: "aresample", options: `${sourceRate}` },
        { filter: "bass", options: `g=${bassGain}` },
      ])
      .audioCodec("libmp3lame")
      .audioBitrate("192k")
      .format("mp3")
      .on("error", (err) => {
        console.error("[audio-converter] ffmpeg convert gagal:", err.message);
        reject(err);
      })
      .on("end", () => resolve(outputPath))
      .save(outputPath);
  });
}

module.exports = { convertAudio, probeSampleRate, probeAudioInfo };
