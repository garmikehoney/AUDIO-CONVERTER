const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

// ffmpeg-static/ffprobe-static bundle binaries per-platform. Kalau binary buat platform ini
// ga ada (install kepotong, atau paket ga support platform tertentu), fallback ke ffmpeg/ffprobe
// yang ada di PATH sistem, daripada langsung crash pas require.
function resolveBinary(pkgName, systemFallback) {
  try {
    const resolved = require(pkgName);
    const binPath = typeof resolved === "string" ? resolved : resolved.path;
    if (binPath && fs.existsSync(binPath)) return binPath;
  } catch {
    // paket ga ke-load / platform ga ke-cover, lanjut ke fallback
  }
  return systemFallback;
}

ffmpeg.setFfmpegPath(resolveBinary("ffmpeg-static", "ffmpeg"));
ffmpeg.setFfprobePath(resolveBinary("ffprobe-static", "ffprobe"));

// Cek isi file beneran ada audio stream-nya atau ngga. Ini validasi yang dipakai,
// bukan Content-Type dari client, karena itu gampang dipalsuin / sering salah
// (banyak client kirim application/octet-stream buat file audio valid sekalipun).
function probeAudioInfo(filePath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return resolve(null);
      const audioStream = data.streams.find((s) => s.codec_type === "audio");
      if (!audioStream) return resolve(null);
      const rate = parseInt(audioStream.sample_rate, 10);
      resolve({ sampleRate: Number.isFinite(rate) && rate > 0 ? rate : 44100 });
    });
  });
}

// Dipakai internal sama convertAudio, fallback 44100 kalau probe gagal di titik ini
// (harusnya udah ke-filter duluan lewat probeAudioInfo di layer route).
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
      .on("error", (err) => reject(err))
      .on("end", () => resolve(outputPath))
      .save(outputPath);
  });
}

module.exports = { convertAudio, probeSampleRate, probeAudioInfo };
