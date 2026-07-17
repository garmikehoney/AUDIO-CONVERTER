const { createApp } = require("./lib/app");

const app = createApp();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[audio-converter] listening on port ${PORT}`);
});
