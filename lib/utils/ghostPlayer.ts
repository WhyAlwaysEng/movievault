"use client";

import { PUBLIC_TEST_STREAM } from "@/lib/constants";
import type { MediaSource } from "@/lib/types";

export interface GhostPlayerOptions {
  title: string;
  sources?: MediaSource[];
  streamUrl?: string;
  year?: number | null;
  type?: string;
  mediaId?: string;
}

/**
 * Opens a standalone chromeless popup window at `about:blank`.
 * Because it runs on `about:blank`, modern browsers (Chrome, Edge, Firefox, Safari)
 * will NEVER write the visit or video URL to the browser's global History (Ctrl+H).
 */
export function openGhostPlayer({
  title,
  sources = [],
  streamUrl,
  year,
  type = "movie",
  mediaId = "",
}: GhostPlayerOptions) {
  if (typeof window === "undefined") return;

  const resolvedSources: MediaSource[] =
    sources.length > 0
      ? sources
      : streamUrl
      ? [{ label: "Main Server", url: streamUrl }]
      : [{ label: "Test Stream (Public HLS)", url: PUBLIC_TEST_STREAM }];

  const width = Math.min(1280, Math.round(window.screen.availWidth * 0.9));
  const height = Math.min(760, Math.round(window.screen.availHeight * 0.88));
  const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
  const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));

  const features = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,directories=no,resizable=yes,scrollbars=no`;

  // Opening `about:blank` prevents the browser from logging the navigation in history
  const popup = window.open("about:blank", "_blank", features);

  if (!popup) {
    alert("Please allow pop-ups for this site to open Ghost Player mode.");
    return;
  }

  const safeTitle = (title || "MovieVault Player").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const sourcesJson = JSON.stringify(resolvedSources);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="referrer" content="no-referrer">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>👻 [Ghost Player] ${safeTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body {
      background-color: #050608;
      color: #f1f5f9;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .header {
      background: rgba(10, 12, 16, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      z-index: 50;
    }
    .brand-title {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .ghost-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(0, 240, 255, 0.12);
      border: 1px solid rgba(0, 240, 255, 0.4);
      color: #00f0ff;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .video-title {
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .server-select {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #e2e8f0;
      padding: 5px 10px;
      border-radius: 8px;
      font-size: 12px;
      outline: none;
      cursor: pointer;
    }
    .btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #e2e8f0;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .btn:hover { background: rgba(255, 255, 255, 0.16); color: #fff; }
    .btn-close {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
      color: #94a3b8;
    }
    .btn-close:hover {
      background: rgba(239, 68, 68, 0.25);
      border-color: rgba(239, 68, 68, 0.5);
      color: #fff;
    }
    .player-viewport {
      flex: 1;
      position: relative;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    video, iframe {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000;
      border: none;
    }
    /* Floating Custom Controls */
    .controls-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 20%, transparent 40%);
      opacity: 0;
      transition: opacity 0.3s ease;
      padding: 16px;
      pointer-events: none;
    }
    .player-viewport:hover .controls-overlay,
    .controls-overlay.show {
      opacity: 1;
      pointer-events: auto;
    }
    .progress-bar-container {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      cursor: pointer;
      position: relative;
      margin-bottom: 12px;
      transition: height 0.15s;
    }
    .progress-bar-container:hover { height: 9px; }
    .progress-filled {
      height: 100%;
      background: linear-gradient(90deg, #00f0ff, #ff0055);
      border-radius: 9999px;
      width: 0%;
      position: relative;
    }
    .control-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .left-controls, .right-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ctrl-btn {
      background: transparent;
      border: none;
      color: #f1f5f9;
      font-size: 14px;
      cursor: pointer;
      padding: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: color 0.2s;
    }
    .ctrl-btn:hover { color: #00f0ff; }
    .time-text { font-size: 12px; color: #94a3b8; font-variant-numeric: tabular-nums; }
    .vol-slider {
      width: 70px;
      accent-color: #00f0ff;
      cursor: pointer;
    }
    .speed-select {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.2);
      color: #e2e8f0;
      border-radius: 6px;
      padding: 2px 6px;
      font-size: 11px;
      cursor: pointer;
    }
    /* Loading Spinner */
    .spinner {
      position: absolute;
      width: 48px;
      height: 48px;
      border: 3px solid rgba(0, 240, 255, 0.2);
      border-top-color: #00f0ff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: none;
      pointer-events: none;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
</head>
<body>
  <header class="header">
    <div class="brand-title">
      <span class="ghost-badge">👻 Ghost Mode (Zero History)</span>
      <span class="video-title">${safeTitle}</span>
    </div>
    <div class="header-actions">
      <select id="serverSelect" class="server-select"></select>
      <button id="btnCast" class="btn" title="Cast to TV (Chromecast / AirPlay)">📺 Cast</button>
      <button id="btnPiP" class="btn" title="Picture in Picture">🪟 PiP</button>
      <button id="btnFullscreen" class="btn" title="Fullscreen">⛶ Fullscreen</button>
      <button id="btnClose" class="btn btn-close" title="Close window">✕ Close (Esc)</button>
    </div>
  </header>

  <main class="player-viewport" id="viewport">
    <canvas id="glowCanvas" width="64" height="36" style="position:absolute; inset:-24px; width:calc(100% + 48px); height:calc(100% + 48px); opacity:0.35; filter:blur(40px); z-index:0; pointer-events:none;"></canvas>
    <video id="videoElement" playsinline crossorigin="anonymous" x-webkit-airplay="allow" style="position:relative; z-index:1;"></video>
    <iframe id="iframeElement" style="display:none; position:relative; z-index:1;" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="no-referrer"></iframe>
    <div id="spinner" class="spinner" style="z-index:10;"></div>
    <div id="dropOverlay" style="position:absolute; inset:0; background:rgba(5,6,8,0.92); border:2px dashed #00f0ff; display:none; align-items:center; justify-content:center; flex-direction:column; z-index:60; color:#00f0ff; font-weight:600; font-size:14px; gap:8px;">
      <span>📥 Drop subtitle file (.srt or .vtt) here</span>
      <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Subtitles will attach to the stream immediately</span>
    </div>

    <div class="controls-overlay" id="controlsOverlay" style="z-index:20;">
      <div class="progress-bar-container" id="progressTrack">
        <div class="progress-filled" id="progressBar"></div>
      </div>
      <div class="control-row">
        <div class="left-controls">
          <button id="btnPlay" class="ctrl-btn" title="Play/Pause">▶</button>
          <button id="btnRewind" class="ctrl-btn" title="Rewind 10s">⏪ 10s</button>
          <button id="btnForward" class="ctrl-btn" title="Forward 10s">⏩ 10s</button>
          <button id="btnSkipIntro" class="ctrl-btn" style="background:rgba(255,255,255,0.08); padding:3px 8px; border-radius:6px; font-size:11px;" title="Skip Intro (+85s)">⏩ +85s Intro</button>
          <span class="time-text" id="timeDisplay">0:00 / 0:00</span>
        </div>
        <div class="right-controls">
          <button id="btnSub" class="ctrl-btn" title="Load Subtitle (.srt / .vtt)">💬 Sub</button>
          <input type="file" id="subInput" accept=".srt,.vtt" style="display:none;" />
          <button id="btnCapture" class="ctrl-btn" title="Screenshot frame (PNG)">📷</button>
          <button id="btnMute" class="ctrl-btn" title="Mute/Unmute">🔊</button>
          <input type="range" id="volSlider" class="vol-slider" min="0" max="1" step="0.05" value="1">
          <select id="speedSelect" class="speed-select">
            <option value="0.75">0.75x</option>
            <option value="1" selected>1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2.0x</option>
          </select>
        </div>
      </div>
    </div>
  </main>

  <script>
    const sources = ${sourcesJson};
    let currentSourceIdx = 0;
    let hls = null;

    const video = document.getElementById("videoElement");
    const iframe = document.getElementById("iframeElement");
    const spinner = document.getElementById("spinner");
    const serverSelect = document.getElementById("serverSelect");
    const progressBar = document.getElementById("progressBar");
    const progressTrack = document.getElementById("progressTrack");
    const timeDisplay = document.getElementById("timeDisplay");
    const btnPlay = document.getElementById("btnPlay");
    const btnMute = document.getElementById("btnMute");
    const volSlider = document.getElementById("volSlider");
    const speedSelect = document.getElementById("speedSelect");
    const btnPiP = document.getElementById("btnPiP");
    const btnFullscreen = document.getElementById("btnFullscreen");
    const btnClose = document.getElementById("btnClose");
    const controlsOverlay = document.getElementById("controlsOverlay");

    // Populate server options
    sources.forEach((s, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = s.label || ("Server " + (i + 1));
      serverSelect.appendChild(opt);
    });

    serverSelect.addEventListener("change", (e) => {
      currentSourceIdx = Number(e.target.value);
      loadSource(sources[currentSourceIdx]);
    });

    function formatTime(s) {
      if (!isFinite(s) || s < 0) return "0:00";
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = Math.floor(s % 60);
      return h > 0
        ? h + ":" + String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0")
        : m + ":" + String(sec).padStart(2, "0");
    }

    function isEmbed(url, kind) {
      if (kind === "embed") return true;
      if (!url) return false;
      const lower = url.toLowerCase();
      return (
        lower.includes("/embed") ||
        lower.includes("/e/") ||
        lower.includes("/t/") ||
        lower.includes("/v/") ||
        lower.includes("youtube.com") ||
        lower.includes("youtu.be") ||
        lower.includes("dailymotion.com") ||
        lower.includes("vimeo.com") ||
        lower.includes("playmogo.com") ||
        lower.includes("dooood.com") ||
        lower.includes("turbovid.vip") ||
        lower.includes("savedvids.com") ||
        lower.includes("javhd.today") ||
        (!lower.includes(".m3u8") && !lower.includes(".mp4") && !lower.includes(".webm"))
      );
    }

    function loadSource(sourceObj) {
      const url = typeof sourceObj === "string" ? sourceObj : sourceObj.url;
      const kind = typeof sourceObj === "object" ? sourceObj.kind : "";
      spinner.style.display = "block";

      if (isEmbed(url, kind)) {
        if (hls) { hls.destroy(); hls = null; }
        video.style.display = "none";
        controlsOverlay.style.display = "none";
        iframe.style.display = "block";
        iframe.src = url;
        spinner.style.display = "none";
        return;
      }

      iframe.style.display = "none";
      iframe.src = "about:blank";
      video.style.display = "block";
      controlsOverlay.style.display = "flex";

      if (hls) { hls.destroy(); hls = null; }

      const isM3u8 = url.includes(".m3u8");
      if (isM3u8 && typeof Hls !== "undefined" && Hls.isSupported()) {
        hls = new Hls({ maxBufferLength: 30, enableWorker: true });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          spinner.style.display = "none";
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
            else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
            else {
              spinner.style.display = "none";
              alert("Server not responding. Please switch servers.");
            }
          }
        });
      } else {
        video.src = url;
        video.onloadeddata = () => { spinner.style.display = "none"; };
        video.play().catch(() => {});
      }
    }

    // Play/Pause
    btnPlay.addEventListener("click", () => {
      if (video.paused) video.play();
      else video.pause();
    });

    video.addEventListener("play", () => { btnPlay.textContent = "⏸"; });
    video.addEventListener("pause", () => { btnPlay.textContent = "▶"; });

    // Timeline updates
    video.addEventListener("timeupdate", () => {
      if (!video.duration) return;
      const pct = (video.currentTime / video.duration) * 100;
      progressBar.style.width = pct + "%";
      timeDisplay.textContent = formatTime(video.currentTime) + " / " + formatTime(video.duration);
    });

    progressTrack.addEventListener("click", (e) => {
      const rect = progressTrack.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      if (isFinite(video.duration)) {
        video.currentTime = pos * video.duration;
      }
    });

    // Rewind / Forward
    document.getElementById("btnRewind").addEventListener("click", () => { video.currentTime = Math.max(0, video.currentTime - 10); });
    document.getElementById("btnForward").addEventListener("click", () => { video.currentTime = Math.min(video.duration || 0, video.currentTime + 10); });

    // Volume
    volSlider.addEventListener("input", (e) => {
      video.volume = Number(e.target.value);
      video.muted = video.volume === 0;
      btnMute.textContent = video.muted ? "🔇" : "🔊";
    });

    btnMute.addEventListener("click", () => {
      video.muted = !video.muted;
      btnMute.textContent = video.muted ? "🔇" : "🔊";
      if (!video.muted && video.volume === 0) {
        video.volume = 0.5;
        volSlider.value = 0.5;
      }
    });

    // Speed
    speedSelect.addEventListener("change", (e) => {
      video.playbackRate = Number(e.target.value);
    });

    // PiP
    btnPiP.addEventListener("click", async () => {
      try {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else if (document.pictureInPictureEnabled) await video.requestPictureInPicture();
      } catch (err) {
        console.warn("PiP error:", err);
      }
    });

    // Fullscreen
    btnFullscreen.addEventListener("click", () => {
      const vp = document.getElementById("viewport");
      if (!document.fullscreenElement) vp.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
    });

    // Cast / AirPlay Trigger
    const btnCast = document.getElementById("btnCast");
    if (btnCast) {
      btnCast.addEventListener("click", async () => {
        if (typeof video.webkitShowPlaybackTargetPicker === "function") {
          try {
            video.webkitShowPlaybackTargetPicker();
            return;
          } catch (e) {}
        }
        if ("remote" in HTMLMediaElement.prototype && video.remote && video.remote.prompt) {
          try {
            await video.remote.prompt();
            return;
          } catch (e) {}
        }
        alert("Searching for Cast devices on the network...");
      });
    }

    // Skip Intro (+85s)
    const btnSkipIntro = document.getElementById("btnSkipIntro");
    if (btnSkipIntro) {
      btnSkipIntro.addEventListener("click", () => {
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 85);
      });
    }

    // Screenshot Capture
    const btnCapture = document.getElementById("btnCapture");
    if (btnCapture) {
      btnCapture.addEventListener("click", () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 1920;
          canvas.height = video.videoHeight || 1080;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const a = document.createElement("a");
          a.href = canvas.toDataURL("image/png");
          a.download = "GhostPlayer_Screenshot_" + Math.floor(video.currentTime) + "s.png";
          a.click();
        } catch (e) {
          alert("Cannot capture screenshot due to CORS restrictions on this stream.");
        }
      });
    }

    // Ambient Glow Loop
    const glowCanvas = document.getElementById("glowCanvas");
    if (glowCanvas) {
      const gctx = glowCanvas.getContext("2d");
      setInterval(() => {
        if (!video.paused && !video.ended && video.readyState >= 2) {
          try { gctx.drawImage(video, 0, 0, glowCanvas.width, glowCanvas.height); } catch (e) {}
        }
      }, 200);
    }

    // Subtitle Drag & Drop + File Picker
    const subInput = document.getElementById("subInput");
    const btnSub = document.getElementById("btnSub");
    const dropOverlay = document.getElementById("dropOverlay");

    function attachSubtitle(file) {
      const reader = new FileReader();
      reader.onload = () => {
        let vtt = reader.result;
        if (file.name.toLowerCase().endsWith(".srt")) {
          vtt = vtt.replace(/(\\d{2}:\\d{2}:\\d{2}),(\\d{3})\\s*-->\\s*(\\d{2}:\\d{2}:\\d{2}),(\\d{3})/g, "$1.$2 --> $3.$4");
          if (!vtt.startsWith("WEBVTT")) vtt = "WEBVTT\\n\\n" + vtt;
        }
        const blob = new Blob([vtt], { type: "text/vtt" });
        const oldTrack = video.querySelector("track");
        if (oldTrack) oldTrack.remove();
        const track = document.createElement("track");
        track.kind = "subtitles";
        track.label = file.name;
        track.src = URL.createObjectURL(blob);
        track.default = true;
        video.appendChild(track);
        btnSub.textContent = "💬 " + file.name.slice(0, 10) + "...";
        btnSub.style.color = "#00f0ff";
      };
      reader.readAsText(file);
    }

    if (btnSub && subInput) {
      btnSub.addEventListener("click", () => subInput.click());
      subInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) attachSubtitle(file);
      });
    }

    window.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (dropOverlay) dropOverlay.style.display = "flex";
    });
    window.addEventListener("dragleave", (e) => {
      if (e.clientX === 0 || e.clientY === 0) {
        if (dropOverlay) dropOverlay.style.display = "none";
      }
    });
    window.addEventListener("drop", (e) => {
      e.preventDefault();
      if (dropOverlay) dropOverlay.style.display = "none";
      const file = Array.from(e.dataTransfer.files).find(
        (f) => f.name.toLowerCase().endsWith(".srt") || f.name.toLowerCase().endsWith(".vtt")
      );
      if (file) attachSubtitle(file);
    });

    // Close Button (kill media, close window)
    function closeWindow() {
      try {
        video.pause();
        video.src = "";
        video.load();
        if (hls) { hls.destroy(); hls = null; }
        iframe.src = "about:blank";
      } catch (e) {}
      window.close();
    }
    btnClose.addEventListener("click", closeWindow);

    // Keyboard Shortcuts
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeWindow();
      else if (e.code === "Space" || e.key === "k") {
        e.preventDefault();
        if (video.paused) video.play(); else video.pause();
      } else if (e.key === "ArrowLeft") {
        video.currentTime = Math.max(0, video.currentTime - 10);
      } else if (e.key === "ArrowRight") {
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
      } else if (e.key === "f" || e.key === "F") {
        btnFullscreen.click();
      } else if (e.key === "m" || e.key === "M") {
        btnMute.click();
      }
    });

    // Start initial source
    if (sources.length > 0) {
      loadSource(sources[0]);
    }
  </script>
</body>
</html>`;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
