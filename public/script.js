const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".tab-panel");
const fileInput = document.getElementById("fileInput");
const fileLabel = document.getElementById("fileLabel");
const dropzone = document.querySelector(".dropzone");
const urlInput = document.getElementById("urlInput");
const presetButtons = document.querySelectorAll(".preset");
const convertBtn = document.getElementById("convertBtn");
const statusMsg = document.getElementById("statusMsg");

let activeTab = "upload";
let selectedPreset = null;

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeTab = tab.dataset.tab;
    tabs.forEach((t) => t.classList.toggle("active", t === tab));
    panels.forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== activeTab));
    updateConvertState();
  });
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  fileLabel.textContent = file ? file.name : "Klik atau seret file audio ke sini";
  dropzone.classList.toggle("has-file", !!file);
  updateConvertState();
});

urlInput.addEventListener("input", updateConvertState);

presetButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedPreset = btn.dataset.preset;
    presetButtons.forEach((b) => b.classList.toggle("active", b === btn));
    updateConvertState();
  });
});

function hasValidSource() {
  if (activeTab === "upload") return !!fileInput.files[0];
  return urlInput.value.trim().length > 0;
}

function updateConvertState() {
  const ready = hasValidSource() && !!selectedPreset;
  convertBtn.disabled = !ready;
  convertBtn.textContent = ready
    ? `Convert (${selectedPreset})`
    : selectedPreset
    ? "Upload file atau isi link dulu"
    : "Pilih preset dulu";
}

convertBtn.addEventListener("click", async () => {
  setStatus("Memproses audio, tunggu sebentar...", false);
  convertBtn.disabled = true;

  const formData = new FormData();
  formData.append("preset", selectedPreset);
  if (activeTab === "upload") {
    formData.append("file", fileInput.files[0]);
  } else {
    formData.append("url", urlInput.value.trim());
  }

  try {
    const res = await fetch("/api/convert", { method: "POST", body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Server error (${res.status})`);
    }

    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : "converted.mp3";

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setStatus("Selesai, file lagi didownload.", false);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    updateConvertState();
  }
});

function setStatus(message, isError) {
  statusMsg.textContent = message;
  statusMsg.classList.toggle("error", isError);
}
