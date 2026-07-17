const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");

const { getPreset } = require("../config/presets");
const { convertAudio, probeAudioInfo } = require("../services/audioConverter");
const { resolveFromUrl, HttpError, TMP_DIR } = require("../services/sourceResolver");

const router = express.Router();

const isVercel = !!process.env.VERCEL;
const MAX_UPLOAD_BYTES = isVercel ? 4 * 1024 * 1024 : 50 * 1024 * 1024;

const upload = multer({
  dest: TMP_DIR,
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

router.post("/convert", upload.single("file"), async (req, res, next) => {
  const filesToCleanup = [];
  if (req.file) filesToCleanup.push(req.file.path);

  try {
    const preset = getPreset(req.body.preset);
    if (!preset) {
      throw new HttpError(400, "Preset tidak valid. Pilih salah satu: 2.3x, 2.5x, 2.7x.");
    }

    let inputPath;
    let originalName = "audio";

    if (req.file) {
      inputPath = req.file.path;
      originalName = path.parse(req.file.originalname).name;
    } else if (req.body.url) {
      inputPath = await resolveFromUrl(req.body.url);
      originalName = path.parse(new URL(req.body.url).pathname).name || "audio";
      filesToCleanup.push(inputPath);
    } else {
      throw new HttpError(400, "Upload file atau isi link dulu.");
    }

    const audioInfo = await probeAudioInfo(inputPath);
    if (!audioInfo) {
      throw new HttpError(415, "File yang diupload bukan file audio yang valid.");
    }

    const outputPath = path.join(TMP_DIR, `${crypto.randomUUID()}.mp3`);
    filesToCleanup.push(outputPath);

    await convertAudio({
      inputPath,
      outputPath,
      speed: preset.speed,
      bassGain: preset.bassGain,
    });

    const downloadName = `${originalName}-${req.body.preset}-sped-up.mp3`;
    res.download(outputPath, downloadName, (err) => {
      cleanup(filesToCleanup);
      if (err && !res.headersSent) next(err);
    });
  } catch (err) {
    cleanup(filesToCleanup);
    next(err);
  }
});

function cleanup(paths) {
  for (const p of paths) {
    fs.unlink(p, (err) => {
      if (err && err.code !== "ENOENT") {
        console.warn(`[audio-converter] gagal hapus temp file ${p}:`, err.message);
      }
    });
  }
}

module.exports = router;
