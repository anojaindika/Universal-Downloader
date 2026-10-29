/**
 * All-Platform Video Downloader
 * Frontend demo + backend integration structure.
 *
 * IMPORTANT:
 * - This file ships in DEMO_MODE by default.
 * - For production, point API_BASE_URL to your own authorized backend.
 * - Do not expose private API keys in frontend JavaScript.
 */

const CONFIG = {
  DEMO_MODE: true,
  API_BASE_URL: "https://your-backend.example.com/api",
  ANALYZE_ENDPOINT: "/analyze",
  DOWNLOAD_ENDPOINT: "/download"
};

const SUPPORTED_PLATFORMS = [
  {
    name: "YouTube",
    hosts: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]
  },
  {
    name: "Facebook",
    hosts: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"]
  },
  {
    name: "TikTok",
    hosts: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com"]
  },
  {
    name: "Instagram",
    hosts: ["instagram.com", "www.instagram.com"]
  },
  {
    name: "X / Twitter",
    hosts: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"]
  }
];

const els = {
  form: document.getElementById("downloadForm"),
  url: document.getElementById("videoUrl"),
  paste: document.getElementById("pasteBtn"),
  analyze: document.getElementById("analyzeBtn"),
  loaderSection: document.getElementById("loaderSection"),
  loaderText: document.getElementById("loaderText"),
  progressBar: document.getElementById("progressBar"),
  progressLabel: document.getElementById("progressLabel"),
  results: document.getElementById("resultsSection"),
  thumbnail: document.getElementById("videoThumbnail"),
  title: document.getElementById("videoTitle"),
  duration: document.getElementById("videoDuration"),
  meta: document.getElementById("videoMeta"),
  platformBadge: document.getElementById("platformBadge"),
  videoOptions: document.getElementById("videoOptions"),
  audioOptions: document.getElementById("audioOptions"),
  alerts: document.getElementById("alertContainer"),
  themeToggle: document.getElementById("themeToggle"),
  sunIcon: document.getElementById("sunIcon"),
  moonIcon: document.getElementById("moonIcon")
};

document.getElementById("currentYear").textContent = new Date().getFullYear();

/* -----------------------------
   Theme
------------------------------ */

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  els.sunIcon.classList.toggle("hidden", isDark);
  els.moonIcon.classList.toggle("hidden", !isDark);
}

function initTheme() {
  const saved = localStorage.getItem("downloader-theme");
  const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (preferredDark ? "dark" : "light"));
}

els.themeToggle.addEventListener("click", () => {
  const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
  localStorage.setItem("downloader-theme", next);
  applyTheme(next);
});

initTheme();

/* -----------------------------
   URL validation
------------------------------ */

function normalizeUrl(raw) {
  return raw.trim();
}

function getPlatform(rawUrl) {
  try {
    const url = new URL(normalizeUrl(rawUrl));
    const hostname = url.hostname.toLowerCase();

    return SUPPORTED_PLATFORMS.find(platform =>
      platform.hosts.some(host => hostname === host || hostname.endsWith(`.${host}`))
    ) || null;
  } catch {
    return null;
  }
}

function validateVideoUrl(rawUrl) {
  if (!rawUrl || !rawUrl.trim()) {
    return { valid: false, message: "Please paste a video URL." };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { valid: false, message: "That does not look like a valid URL." };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, message: "Only HTTP or HTTPS links are supported." };
  }

  const platform = getPlatform(rawUrl);
  if (!platform) {
    return {
      valid: false,
      message: "Unsupported platform. Try YouTube, Facebook, TikTok, Instagram, or X/Twitter."
    };
  }

  return { valid: true, platform };
}

/* -----------------------------
   Alerts
------------------------------ */

let alertTimer;

function showAlert(type, message) {
  clearTimeout(alertTimer);

  const icon = type === "success" ? "✓" : type === "error" ? "!" : "i";
  els.alerts.innerHTML = `
    <div class="alert alert-${type}" role="alert">
      <span class="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-current text-[11px] font-black">${icon}</span>
      <span>${escapeHtml(message)}</span>
    </div>
  `;

  alertTimer = setTimeout(() => {
    els.alerts.innerHTML = "";
  }, 6500);
}

/* -----------------------------
   Clipboard
------------------------------ */

els.paste.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    els.url.value = text;
    els.url.focus();
    showAlert("info", "Link pasted from clipboard.");
  } catch {
    showAlert("error", "Clipboard access was blocked. Paste the link manually.");
  }
});

/* -----------------------------
   Tabs
------------------------------ */

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");

    const tab = btn.dataset.tab;
    document.getElementById("videoTab").classList.toggle("hidden", tab !== "video");
    document.getElementById("audioTab").classList.toggle("hidden", tab !== "audio");
  });
});

/* -----------------------------
   Form flow
------------------------------ */

els.form.addEventListener("submit", async event => {
  event.preventDefault();

  const rawUrl = normalizeUrl(els.url.value);
  const check = validateVideoUrl(rawUrl);

  if (!check.valid) {
    els.results.classList.add("hidden");
    showAlert("error", check.message);
    return;
  }

  try {
    setBusy(true);
    els.results.classList.add("hidden");
    await runProgress();

    const data = CONFIG.DEMO_MODE
      ? await getMockMediaData(rawUrl, check.platform.name)
      : await analyzeMedia(rawUrl);

    renderResult(data);
    showAlert(
      "success",
      CONFIG.DEMO_MODE
        ? "Demo result ready. Connect your backend API for real media downloads."
        : "Media analyzed successfully."
    );

    els.results.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error(error);
    showAlert("error", error.message || "Unable to analyze this link.");
  } finally {
    setBusy(false);
  }
});

function setBusy(isBusy) {
  els.analyze.disabled = isBusy;
  els.loaderSection.classList.toggle("hidden", !isBusy);
  els.analyze.querySelector(".button-text").textContent = isBusy ? "Analyzing..." : "Download";

  if (!isBusy) {
    setTimeout(() => {
      setProgress(0, "Ready");
    }, 250);
  }
}

async function runProgress() {
  const stages = [
    [15, "Validating URL"],
    [38, "Connecting to media service"],
    [62, "Reading metadata"],
    [84, "Checking available formats"],
    [100, "Preparing options"]
  ];

  for (const [value, text] of stages) {
    setProgress(value, text);
    await delay(240 + Math.random() * 180);
  }
}

function setProgress(value, text) {
  els.progressBar.style.width = `${value}%`;
  els.progressLabel.textContent = `${value}%`;
  els.loaderText.textContent = text;
}

/* -----------------------------
   Backend API integration
------------------------------ */

/**
 * Expected production response:
 * {
 *   "id": "abc123",
 *   "title": "Example video",
 *   "thumbnail": "https://...",
 *   "duration": "03:42",
 *   "platform": "YouTube",
 *   "author": "Channel Name",
 *   "formats": [
 *     {
 *       "id": "mp4-1080",
 *       "kind": "video",
 *       "label": "1080p",
 *       "ext": "MP4",
 *       "size": "84 MB"
 *     },
 *     {
 *       "id": "mp3-320",
 *       "kind": "audio",
 *       "label": "320 kbps",
 *       "ext": "MP3",
 *       "size": "8.7 MB"
 *     }
 *   ]
 * }
 */
async function analyzeMedia(url) {
  const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ANALYZE_ENDPOINT}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ url })
  });

  if (!response.ok) {
    const errorData = await safeJson(response);
    throw new Error(errorData?.message || `Analyze request failed (${response.status}).`);
  }

  return response.json();
}

/**
 * Recommended production pattern:
 * POST /api/download
 * body: { mediaId, formatId }
 *
 * Backend should:
 * 1. Re-validate URL/media ID.
 * 2. Check authorization/rate limits.
 * 3. Prepare or proxy the permitted media file.
 * 4. Return a short-lived HTTPS download URL.
 */
async function requestDownload(mediaId, formatId) {
  const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.DOWNLOAD_ENDPOINT}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaId, formatId })
  });

  if (!response.ok) {
    const errorData = await safeJson(response);
    throw new Error(errorData?.message || `Download request failed (${response.status}).`);
  }

  return response.json();
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/* -----------------------------
   Mock/demo data
------------------------------ */

async function getMockMediaData(url, platform) {
  await delay(350);

  return {
    id: `demo-${Date.now()}`,
    sourceUrl: url,
    title: `${platform} Demo Video — Preview Ready`,
    thumbnail: createDemoThumbnail(platform),
    duration: "03:42",
    platform,
    author: "Demo Creator",
    formats: [
      { id: "mp4-1080", kind: "video", label: "1080p Full HD", ext: "MP4", size: "84 MB", note: "Best quality" },
      { id: "mp4-720", kind: "video", label: "720p HD", ext: "MP4", size: "48 MB", note: "Recommended" },
      { id: "mp4-480", kind: "video", label: "480p", ext: "MP4", size: "27 MB", note: "Smaller file" },
      { id: "mp3-320", kind: "audio", label: "320 kbps", ext: "MP3", size: "8.7 MB", note: "High quality audio" }
    ]
  };
}

function createDemoThumbnail(platform) {
  const safePlatform = escapeHtml(platform);
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#111827"/>
        <stop offset="0.48" stop-color="#5b21b6"/>
        <stop offset="1" stop-color="#0891b2"/>
      </linearGradient>
    </defs>
    <rect width="1280" height="720" fill="url(#g)"/>
    <circle cx="640" cy="330" r="92" fill="rgba(255,255,255,.14)"/>
    <path d="M620 280 L620 380 L710 330 Z" fill="white"/>
    <text x="640" y="500" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="white">${safePlatform}</text>
    <text x="640" y="555" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,.72)">Demo media preview</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/* -----------------------------
   Rendering
------------------------------ */

function renderResult(data) {
  els.thumbnail.src = data.thumbnail;
  els.title.textContent = data.title || "Untitled media";
  els.duration.textContent = data.duration || "--:--";
  els.platformBadge.textContent = data.platform || "Media";
  els.meta.textContent = [data.author, data.platform, data.duration].filter(Boolean).join(" • ");

  const videoFormats = (data.formats || []).filter(format => format.kind === "video");
  const audioFormats = (data.formats || []).filter(format => format.kind === "audio");

  els.videoOptions.innerHTML = videoFormats.length
    ? videoFormats.map(format => optionTemplate(data.id, format)).join("")
    : emptyFormats("No video formats available.");

  els.audioOptions.innerHTML = audioFormats.length
    ? audioFormats.map(format => optionTemplate(data.id, format)).join("")
    : emptyFormats("No audio formats available.");

  els.results.classList.remove("hidden");

  document.querySelectorAll("[data-download-format]").forEach(button => {
    button.addEventListener("click", async () => {
      const mediaId = button.dataset.mediaId;
      const formatId = button.dataset.downloadFormat;

      if (CONFIG.DEMO_MODE) {
        showAlert("info", "Demo mode is active. Set DEMO_MODE to false and connect your backend to enable real downloads.");
        return;
      }

      await handleRealDownload(button, mediaId, formatId);
    });
  });
}

function optionTemplate(mediaId, format) {
  return `
    <div class="download-option">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <strong class="text-sm">${escapeHtml(format.label)}</strong>
          <span class="option-badge">${escapeHtml(format.ext)}</span>
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          ${escapeHtml(format.size || "Size unavailable")}
          ${format.note ? ` • ${escapeHtml(format.note)}` : ""}
        </p>
      </div>
      <button
        class="option-download-btn shrink-0"
        type="button"
        data-media-id="${escapeHtml(mediaId)}"
        data-download-format="${escapeHtml(format.id)}"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3v12"></path>
          <path d="m7 10 5 5 5-5"></path>
          <path d="M5 21h14"></path>
        </svg>
        Download
      </button>
    </div>
  `;
}

function emptyFormats(message) {
  return `<div class="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700">${escapeHtml(message)}</div>`;
}

async function handleRealDownload(button, mediaId, formatId) {
  const original = button.innerHTML;

  try {
    button.disabled = true;
    button.textContent = "Preparing...";

    const payload = await requestDownload(mediaId, formatId);

    if (!payload?.downloadUrl) {
      throw new Error("Backend did not return a download URL.");
    }

    // Short-lived, backend-generated HTTPS URL is recommended.
    window.location.assign(payload.downloadUrl);
    showAlert("success", "Your download is ready.");
  } catch (error) {
    console.error(error);
    showAlert("error", error.message || "Unable to prepare the download.");
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

/* -----------------------------
   Helpers
------------------------------ */

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
