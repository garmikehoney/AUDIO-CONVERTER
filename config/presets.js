const PRESETS = {
  "2.3x": { speed: 2.3, bassGain: 4, label: "2.3x ~4dB" },
  "2.5x": { speed: 2.5, bassGain: 6, label: "2.5x ~6dB" },
  "2.7x": { speed: 2.7, bassGain: 8, label: "2.7x ~8dB" },
};

function getPreset(key) {
  return PRESETS[key] || null;
}

module.exports = { PRESETS, getPreset };
