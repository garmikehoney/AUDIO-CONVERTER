const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");

const TMP_DIR = os.tmpdir();
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = [
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg",
  "audio/flac", "audio/x-flac", "audio/mp4", "audio/m4a", "application/octet-stream",
];

async function resolveFromUrl(sourceUrl) {
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new HttpError(400, "Link tidak valid.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new HttpError(400, "Link harus http atau https.");
  }

  const response = await axios.get(sourceUrl, {
    responseType: "stream",
    timeout: 15000,
    maxContentLength: MAX_DOWNLOAD_BYTES,
    maxBodyLength: MAX_DOWNLOAD_BYTES,
    validateStatus: (s) => s === 200,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; audio-speed-bass-converter/1.0)" },
  }).catch((err) => {
    throw new HttpError(400, `Gagal ambil file dari link: ${err.message}`);
  });

  const contentType = (response.headers["content-type"] || "").split(";")[0].trim();
  if (contentType && !ALLOWED_CONTENT_TYPES.includes(contentType)) {
    response.data.destroy();
    throw new HttpError(415, `Tipe file dari link tidak didukung (${contentType}).`);
  }

  const ext = extensionFromContentType(contentType) || path.extname(parsed.pathname) || ".mp3";
  const destPath = path.join(TMP_DIR, `${crypto.randomUUID()}${ext}`);

  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(destPath);
    let bytes = 0;
    response.data.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_DOWNLOAD_BYTES) {
        writer.destroy();
        response.data.destroy();
        fs.unlink(destPath, () => {});
        reject(new HttpError(413, "File dari link kebesaran (maks 50MB)."));
      }
    });
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  return destPath;
}

function extensionFromContentType(contentType) {
  const map = {
    "audio/mpeg": ".mp3", "audio/mp3": ".mp3", "audio/wav": ".wav", "audio/x-wav": ".wav",
    "audio/ogg": ".ogg", "audio/flac": ".flac", "audio/x-flac": ".flac",
    "audio/mp4": ".m4a", "audio/m4a": ".m4a",
  };
  return map[contentType];
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = { resolveFromUrl, HttpError, TMP_DIR };
