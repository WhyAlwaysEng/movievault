"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Airplay,
  Camera,
  Cast,
  Check,
  FastForward,
  Flag,
  Gauge,
  Maximize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Sparkles,
  Subtitles,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { MediaSource } from "@/lib/types";
import {
  clearResume,
  isFinished,
  loadResume,
  saveResume,
} from "@/lib/utils/playback";
import { PUBLIC_TEST_STREAM } from "@/lib/constants";
import { usePlayerStore, useUiStore } from "@/lib/store";
import { fileToVttUrl } from "@/lib/utils/subtitles";
import { useCast } from "@/lib/utils/cast";

interface VideoPlayerProps {
  mediaId: string;
  sources?: MediaSource[];
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

const FALLBACK_SOURCES: MediaSource[] = [
  { label: "Public test stream (HLS)", url: PUBLIC_TEST_STREAM },
];

export default function VideoPlayer({ mediaId, sources = [] }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const subInputRef = useRef<HTMLInputElement | null>(null);
  const hlsRef = useRef<any | null>(null);
  const lastSave = useRef(0);

  const sourceIndex = usePlayerStore((s) => s.sourceIndex);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const setSourceIndex = usePlayerStore((s) => s.setSourceIndex);
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);
  const pushToast = useUiStore((s) => s.pushToast);

  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
  const [subtitleName, setSubtitleName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [glowEnabled, setGlowEnabled] = useState(true);

  // Subtitle & Audio track switcher state
  const [menuOpen, setMenuOpen] = useState(false);
  const [subEnabled, setSubEnabled] = useState(true);
  const [subSize, setSubSize] = useState<"sm" | "md" | "lg">("md");
  const [subColor, setSubColor] = useState<"white" | "yellow" | "cyan">("white");
  const [audioTracks, setAudioTracks] = useState<Array<{ id: number; name: string; lang?: string }>>([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState(0);
  const [embeddedSubs, setEmbeddedSubs] = useState<Array<{ id: number; name: string; lang?: string }>>([]);
  const [selectedSubTrack, setSelectedSubTrack] = useState<string>("custom");

  const resolved = useMemo(
    () => (sources.length > 0 ? sources : FALLBACK_SOURCES),
    [sources],
  );
  const source = resolved[Math.min(sourceIndex, resolved.length - 1)];
  const hasMoreSources = sourceIndex + 1 < resolved.length;

  const isCurrentEmbed = useMemo(() => {
    if (!source?.url) return false;
    if (source.kind === "embed") return true;
    const lower = source.url.toLowerCase();
    return (
      lower.includes("/embed") ||
      lower.includes("/e/") ||
      lower.includes("/t/") ||
      lower.includes("/v/") ||
      lower.includes("youtube.com") ||
      lower.includes("youtu.be") ||
      lower.includes("playmogo.com") ||
      lower.includes("turbovid.vip") ||
      lower.includes("savedvids.com") ||
      lower.includes("javhd.today") ||
      (!lower.includes(".m3u8") && !lower.includes(".mp4") && !lower.includes(".webm"))
    );
  }, [source]);

  const { hasAirPlay, isCasting, castDevice, requestCast } = useCast({
    videoRef,
    streamUrl: source?.url,
    title: "MovieVault Stream",
    onToast: pushToast,
  });

  const failOver = useCallback(() => {
    if (sourceIndex + 1 < resolved.length) {
      pushToast(
        `Primary server issue — switching to next server (${resolved.length - sourceIndex - 1} remaining)`,
        "info",
      );
      setSourceIndex(sourceIndex + 1);
    } else {
      setFailed(true);
      pushToast("All streaming servers failed — click flag to report broken link", "error");
    }
  }, [sourceIndex, resolved.length, pushToast, setSourceIndex]);

  const failOverRef = useRef(failOver);
  useEffect(() => {
    failOverRef.current = failOver;
  }, [failOver]);

  // Attach HLS.js or native HLS (Safari) per source index (§6.1–6.2)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setFailed(false);

    const currentSource = resolved[Math.min(sourceIndex, resolved.length - 1)];
    const url = currentSource.url;
    const isEmbedUrl =
      currentSource.kind === "embed" ||
      url.includes("/embed") ||
      url.includes("/e/") ||
      url.includes("/t/") ||
      url.includes("/v/") ||
      url.includes("youtube.com") ||
      url.includes("youtu.be") ||
      url.includes("playmogo.com") ||
      url.includes("turbovid.vip") ||
      url.includes("savedvids.com") ||
      url.includes("javhd.today") ||
      (!url.includes(".m3u8") && !url.includes(".mp4") && !url.includes(".webm"));

    if (isEmbedUrl) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    const nativeHls = video.canPlayType("application/vnd.apple.mpegurl");

    if (nativeHls) {
      video.src = url;
      video.play().catch(() => {});
      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    }

    let disposed = false;
    import("hls.js").then(({ default: Hls }) => {
      if (disposed || !videoRef.current || !Hls.isSupported()) return;
      if (hlsRef.current) hlsRef.current.destroy();

      const hls = new Hls({ maxBufferLength: 30 });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_evt, data) => {
        if (data.audioTracks && data.audioTracks.length > 0) {
          setAudioTracks(
            data.audioTracks.map((t: any, idx: number) => ({
              id: idx,
              name: t.name || (t.lang ? t.lang.toUpperCase() : `Audio ${idx + 1}`),
              lang: t.lang,
            }))
          );
          setSelectedAudioTrack(hls.audioTrack);
        }
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_evt, data) => {
        setSelectedAudioTrack(data.id);
      });

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_evt, data) => {
        if (data.subtitleTracks && data.subtitleTracks.length > 0) {
          setEmbeddedSubs(
            data.subtitleTracks.map((t: any, idx: number) => ({
              id: idx,
              name: t.name || (t.lang ? t.lang.toUpperCase() : `Subtitle ${idx + 1}`),
              lang: t.lang,
            }))
          );
        }
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          failOverRef.current();
        }
      });
    });

    return () => {
      disposed = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [sourceIndex, resolved]);

  // Playback rate sync
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // Resume from saved position (§6.3)
  const onLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
    const pos = loadResume(mediaId);
    if (pos && !isFinished(pos.time, pos.duration) && pos.time > 5) {
      video.currentTime = Math.min(pos.time, (video.duration || pos.time) - 5);
      pushToast(`Resuming playback from ${formatTime(pos.time)}`, "info");
    }

    // Inspect native audio tracks if available (Safari / native HTML5)
    if ((video as any).audioTracks && (video as any).audioTracks.length > 0) {
      const vTracks = (video as any).audioTracks;
      const arr = [];
      for (let i = 0; i < vTracks.length; i++) {
        arr.push({
          id: i,
          name: vTracks[i].label || (vTracks[i].language ? vTracks[i].language.toUpperCase() : `Audio ${i + 1}`),
          lang: vTracks[i].language,
        });
        if (vTracks[i].enabled) setSelectedAudioTrack(i);
      }
      setAudioTracks(arr);
    }
  }, [mediaId, pushToast]);

  const switchSubtitleTrack = (trackType: "off" | "custom" | string) => {
    setSelectedSubTrack(trackType);
    if (trackType === "off") {
      setSubEnabled(false);
      if (hlsRef.current && typeof hlsRef.current.subtitleTrack === "number") {
        hlsRef.current.subtitleTrack = -1;
      }
    } else if (trackType === "custom") {
      setSubEnabled(true);
      if (hlsRef.current && typeof hlsRef.current.subtitleTrack === "number") {
        hlsRef.current.subtitleTrack = -1;
      }
    } else {
      const trackId = parseInt(trackType, 10);
      setSubEnabled(false);
      if (hlsRef.current && typeof hlsRef.current.subtitleTrack === "number") {
        hlsRef.current.subtitleTrack = trackId;
      }
    }
  };

  const switchAudioTrack = (idx: number) => {
    if (hlsRef.current && typeof hlsRef.current.audioTrack === "number") {
      hlsRef.current.audioTrack = idx;
      setSelectedAudioTrack(idx);
      pushToast(`Switched audio: ${audioTracks[idx]?.name || `Track ${idx + 1}`}`, "info");
    } else if (videoRef.current && (videoRef.current as any).audioTracks) {
      const vTracks = (videoRef.current as any).audioTracks;
      for (let i = 0; i < vTracks.length; i++) {
        vTracks[i].enabled = i === idx;
      }
      setSelectedAudioTrack(idx);
      pushToast(`Switched audio: ${audioTracks[idx]?.name || `Track ${idx + 1}`}`, "info");
    }
  };

  const removeCustomSubtitle = () => {
    setSubtitleUrl(null);
    setSubtitleName(null);
    if (selectedSubTrack === "custom") {
      setSelectedSubTrack("off");
      setSubEnabled(false);
    }
    pushToast("Custom subtitles removed", "info");
  };

  // Throttled position save (~every 5s) + finished detection (§6.3)
  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setProgress(video.currentTime);
    if (video.duration) setDuration(video.duration);

    const now = Date.now();
    if (now - lastSave.current < 5000) return;
    lastSave.current = now;

    if (isFinished(video.currentTime, video.duration)) {
      clearResume(mediaId);
    } else {
      saveResume(mediaId, video.currentTime, video.duration);
    }
  }, [mediaId]);

  // J / K / L shortcuts (§5.6)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        if (video.paused) video.play().catch(() => {});
        else video.pause();
      } else if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else video.requestFullscreen().catch(() => {});
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        video.muted = !video.muted;
        setMuted(video.muted);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Ambient Glow rendering loop
  useEffect(() => {
    if (!glowEnabled) return;
    const video = videoRef.current;
    const canvas = ambientCanvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let animId: number;
    const updateGlow = () => {
      if (!video.paused && !video.ended && video.readyState >= 2) {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } catch {
          // Ignore CORS canvas draw errors
        }
      }
      animId = requestAnimationFrame(updateGlow);
    };

    animId = requestAnimationFrame(updateGlow);
    return () => cancelAnimationFrame(animId);
  }, [glowEnabled]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const seekBy = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + delta));
  };

  const skipIntro = () => {
    seekBy(85);
    pushToast("Skipped Intro (+85s)", "info");
  };

  const captureScreenshot = () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `MovieVault_${mediaId || "video"}_${Math.floor(video.currentTime)}s.png`;
      a.click();
      pushToast("Screenshot saved successfully", "success");
    } catch {
      pushToast("Unable to capture screenshot (blocked by stream CORS policy)", "error");
    }
  };

  const handleSubFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".srt") && !file.name.toLowerCase().endsWith(".vtt")) {
      pushToast("Only .srt and .vtt subtitle formats are supported", "error");
      return;
    }
    try {
      const url = await fileToVttUrl(file);
      setSubtitleUrl(url);
      setSubtitleName(file.name);
      setSelectedSubTrack("custom");
      setSubEnabled(true);
      pushToast(`Loaded subtitles "${file.name}"`, "success");
    } catch {
      pushToast("Failed to process subtitle file", "error");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const subFile = files.find(
      (f) => f.name.toLowerCase().endsWith(".srt") || f.name.toLowerCase().endsWith(".vtt"),
    );
    if (subFile) {
      void handleSubFile(subFile);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else video.requestFullscreen().catch(() => {});
  };

  const togglePip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      /* unsupported */
    }
  };

  const reportBrokenLink = () => {
    pushToast("Report submitted — administrator will inspect", "success");
  };

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="relative">
      {/* Subtitle Cue Styling */}
      <style>{`
        video::cue {
          font-size: ${subSize === "sm" ? "14px" : subSize === "lg" ? "24px" : "18px"} !important;
          color: ${subColor === "yellow" ? "#facc15" : subColor === "cyan" ? "#22d3ee" : "#ffffff"} !important;
          background-color: rgba(0, 0, 0, 0.78) !important;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95) !important;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          line-height: 1.4 !important;
          padding: 2px 8px !important;
          border-radius: 4px !important;
        }
      `}</style>

      {/* Ambient Glow Canvas */}
      {glowEnabled && (
        <canvas
          ref={ambientCanvasRef}
          width={64}
          height={36}
          className="pointer-events-none absolute -inset-6 -z-10 h-[calc(100%+3rem)] w-[calc(100%+3rem)] rounded-3xl opacity-40 blur-3xl transition-opacity duration-700"
        />
      )}

      {/* Hidden file input for subtitles */}
      <input
        ref={subInputRef}
        type="file"
        accept=".srt,.vtt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleSubFile(file);
        }}
      />

      <div
        className="glass-strong relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-glass"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="relative bg-black aspect-video w-full">
          {isCurrentEmbed ? (
            <iframe
              src={source?.url}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="no-referrer"
            />
          ) : (
            <video
              ref={videoRef}
              className="aspect-video w-full"
              playsInline
              crossOrigin="anonymous"
              x-webkit-airplay="allow"
              onPlay={() => setPaused(false)}
              onPause={() => setPaused(true)}
              onLoadedMetadata={onLoadedMetadata}
              onTimeUpdate={onTimeUpdate}
              onEnded={() => {
                clearResume(mediaId);
                pushToast("Finished watching — recorded to history", "success");
              }}
            >
              {subtitleUrl && subEnabled && selectedSubTrack === "custom" && (
                <track
                  key={subtitleUrl}
                  src={subtitleUrl}
                  kind="subtitles"
                  label={subtitleName || "Subtitles"}
                  default
                />
              )}
            </video>
          )}

          {/* Drag & Drop Subtitle Overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-obsidian/90 border-2 border-dashed border-accent backdrop-blur-sm">
              <Subtitles className="h-10 w-10 text-accent animate-pulse" />
              <p className="mt-2 text-sm font-semibold text-white">
                Drop subtitle file (.srt or .vtt) here
              </p>
              <p className="text-xs text-mist">
                Parsed and rendered instantly on video
              </p>
            </div>
          )}

          {/* Skip Intro Overlay Button */}
          {progress < 180 && duration > 240 && (
            <button
              onClick={skipIntro}
              className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-full border border-white/20 bg-obsidian/80 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition hover:border-accent hover:bg-accent/20 hover:text-accent"
              title="Skip first 85 seconds"
            >
              <FastForward className="h-3.5 w-3.5" />
              <span>Skip Intro (+85s)</span>
            </button>
          )}

          {failed && (
            <div className="absolute inset-0 grid place-items-center bg-black/80">
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <p className="text-sm text-slate-200">Unable to play video from any configured server</p>
                <button
                  onClick={reportBrokenLink}
                  className="flex items-center gap-2 rounded-lg border border-neon/50 px-4 py-2 text-sm text-neon transition hover:bg-neon/10"
                >
                  <Flag className="h-4 w-4" />
                  Report Broken Link
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Subtitle & Audio Popover Modal */}
        {menuOpen && (
          <>
            <div
              className="absolute inset-0 z-30 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute bottom-14 right-3 z-40 w-80 max-w-[calc(100%-1.5rem)] rounded-xl border border-white/10 bg-obsidian/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Subtitles className="h-4 w-4 text-accent" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-white">
                    Audio & Subtitles
                  </span>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="rounded p-1 text-mist transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-3.5">
                {/* Subtitle Track Selector */}
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-mist">
                    Subtitle Track
                  </span>
                  <div className="mt-1.5 space-y-1">
                    {/* Off */}
                    <button
                      onClick={() => switchSubtitleTrack("off")}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                        selectedSubTrack === "off" || !subEnabled
                          ? "bg-accent/20 font-medium text-accent"
                          : "text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      <span>Off</span>
                      {(selectedSubTrack === "off" || !subEnabled) && (
                        <Check className="h-3.5 w-3.5 text-accent" />
                      )}
                    </button>

                    {/* Custom Uploaded Track */}
                    {subtitleName && (
                      <div
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                          selectedSubTrack === "custom" && subEnabled
                            ? "bg-accent/20 font-medium text-accent"
                            : "text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        <button
                          onClick={() => switchSubtitleTrack("custom")}
                          className="flex flex-1 items-center gap-1.5 truncate text-left"
                          title={subtitleName}
                        >
                          <span className="truncate">{subtitleName}</span>
                          <span className="rounded bg-accent/30 px-1 py-0.5 text-[9px] font-mono uppercase text-accent">
                            FILE
                          </span>
                        </button>
                        <div className="flex items-center gap-1 ml-2">
                          {selectedSubTrack === "custom" && subEnabled && (
                            <Check className="h-3.5 w-3.5 text-accent" />
                          )}
                          <button
                            onClick={removeCustomSubtitle}
                            title="Remove subtitle"
                            className="rounded p-1 text-mist hover:text-rose-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Embedded HLS Subtitles */}
                    {embeddedSubs.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => switchSubtitleTrack(String(t.id))}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                          selectedSubTrack === String(t.id) && subEnabled
                            ? "bg-accent/20 font-medium text-accent"
                            : "text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        <span>{t.name}</span>
                        {selectedSubTrack === String(t.id) && subEnabled && (
                          <Check className="h-3.5 w-3.5 text-accent" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Upload button */}
                  <button
                    onClick={() => subInputRef.current?.click()}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/20 py-1.5 text-[11px] text-mist transition hover:border-accent hover:bg-accent/5 hover:text-accent"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Subtitle (.srt / .vtt)</span>
                  </button>
                </div>

                {/* Subtitle Appearance Settings */}
                {selectedSubTrack !== "off" && subEnabled && (
                  <div className="border-t border-white/10 pt-2.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-mist">
                      <span>Font Size</span>
                      <div className="flex items-center gap-1">
                        {(["sm", "md", "lg"] as const).map((sz) => (
                          <button
                            key={sz}
                            onClick={() => setSubSize(sz)}
                            className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase transition ${
                              subSize === sz
                                ? "bg-accent text-white"
                                : "bg-white/5 text-mist hover:text-white"
                            }`}
                          >
                            {sz === "sm" ? "Small" : sz === "md" ? "Med" : "Large"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-mist">
                      <span>Font Color</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSubColor("white")}
                          title="White"
                          className={`h-4 w-4 rounded-full border bg-white ${
                            subColor === "white"
                              ? "ring-2 ring-accent ring-offset-1 ring-offset-black"
                              : "border-white/40"
                          }`}
                        />
                        <button
                          onClick={() => setSubColor("yellow")}
                          title="Yellow"
                          className={`h-4 w-4 rounded-full border bg-yellow-400 ${
                            subColor === "yellow"
                              ? "ring-2 ring-accent ring-offset-1 ring-offset-black"
                              : "border-yellow-400/40"
                          }`}
                        />
                        <button
                          onClick={() => setSubColor("cyan")}
                          title="Cyan"
                          className={`h-4 w-4 rounded-full border bg-cyan-400 ${
                            subColor === "cyan"
                              ? "ring-2 ring-accent ring-offset-1 ring-offset-black"
                              : "border-cyan-400/40"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Audio Track Selector */}
                <div className="border-t border-white/10 pt-2.5">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-mist">
                    <Volume2 className="h-3 w-3 text-cyan-400" />
                    <span>Audio Track</span>
                  </div>

                  {audioTracks.length > 0 ? (
                    <div className="space-y-1">
                      {audioTracks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => switchAudioTrack(t.id)}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                            selectedAudioTrack === t.id
                              ? "bg-cyan-500/20 font-medium text-cyan-400"
                              : "text-slate-300 hover:bg-white/5"
                          }`}
                        >
                          <span>{t.name}</span>
                          {selectedAudioTrack === t.id && (
                            <Check className="h-3.5 w-3.5 text-cyan-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-slate-300">
                      <span>Default (Original Audio)</span>
                      <Check className="h-3.5 w-3.5 text-cyan-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* controls */}
        <div className="flex flex-wrap items-center gap-1 px-3 py-2.5 sm:gap-2">
          <button onClick={togglePlay} aria-label="Play / Pause" className="rounded p-1.5 text-slate-200 transition hover:bg-white/10">
            {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </button>
          <button onClick={() => seekBy(-10)} aria-label="Seek backward 10s" className="rounded p-1.5 text-mist transition hover:bg-white/10 hover:text-white">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button onClick={() => seekBy(10)} aria-label="Seek forward 10s" className="rounded p-1.5 text-mist transition hover:bg-white/10 hover:text-white">
            <RotateCw className="h-4 w-4" />
          </button>
          <button onClick={toggleMute} aria-label="Toggle mute" className="rounded p-1.5 text-mist transition hover:bg-white/10 hover:text-white">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <span className="ml-1 font-mono text-xs tabular-nums text-mist">
            {formatTime(progress)} / {formatTime(duration)}
          </span>

          {/* progress bar */}
          <div className="mx-2 h-1 flex-1 min-w-16 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-neon"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex items-center gap-1">
            {/* Subtitle & Audio Popover Trigger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Subtitles and Audio"
              title="Subtitles & Audio Tracks"
              className={`relative rounded p-1.5 transition ${
                menuOpen || (selectedSubTrack !== "off" && subEnabled && (subtitleUrl || embeddedSubs.length > 0))
                  ? "text-accent bg-accent/15"
                  : "text-mist hover:bg-white/10 hover:text-white"
              }`}
            >
              <Subtitles className="h-4 w-4" />
              {selectedSubTrack !== "off" && subEnabled && (subtitleUrl || embeddedSubs.length > 0) && (
                <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </button>

            {/* Screenshot Button */}
            <button
              onClick={captureScreenshot}
              aria-label="Capture screenshot"
              title="Capture high-resolution screenshot (PNG)"
              className="rounded p-1.5 text-mist transition hover:bg-white/10 hover:text-white"
            >
              <Camera className="h-4 w-4" />
            </button>

            {/* Ambient Glow Toggle */}
            <button
              onClick={() => {
                setGlowEnabled(!glowEnabled);
                pushToast(glowEnabled ? "Disabled Ambient Glow" : "Enabled Ambient Glow", "info");
              }}
              aria-label="Ambient Glow"
              title={glowEnabled ? "Turn off Ambient Glow" : "Turn on Ambient Glow"}
              className={`rounded p-1.5 transition ${
                glowEnabled ? "text-cyan-400 bg-cyan-400/10" : "text-mist hover:bg-white/10"
              }`}
            >
              <Sparkles className="h-4 w-4" />
            </button>

            <select
              value={playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              aria-label="Playback speed"
              className="rounded border border-white/10 bg-obsidian/60 px-1.5 py-1 text-xs text-slate-200 outline-none"
            >
              {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                <option key={r} value={r}>
                  {r}×
                </option>
              ))}
            </select>

            <select
              value={sourceIndex}
              onChange={(e) => setSourceIndex(Number(e.target.value))}
              aria-label="Streaming server"
              className="hidden rounded border border-white/10 bg-obsidian/60 px-1.5 py-1 text-xs text-slate-200 outline-none sm:block"
            >
              {resolved.map((s, i) => (
                <option key={i} value={i}>
                  {s.label}
                </option>
              ))}
            </select>

            {/* Cast / AirPlay Button */}
            <button
              onClick={requestCast}
              aria-label="Cast to TV"
              title={
                isCasting
                  ? `Casting to ${castDevice || "Smart TV"} (Click to disconnect)`
                  : hasAirPlay
                  ? "AirPlay to Apple TV / Smart TV"
                  : "Cast via Google Cast / Smart TV"
              }
              className={`rounded p-1.5 transition ${
                isCasting
                  ? "text-accent bg-accent/20 animate-pulse"
                  : "text-mist hover:bg-white/10 hover:text-white"
              }`}
            >
              {hasAirPlay ? <Airplay className="h-4 w-4" /> : <Cast className="h-4 w-4" />}
            </button>

            <button onClick={togglePip} aria-label="Picture-in-Picture" className="hidden rounded p-1.5 text-mist transition hover:bg-white/10 hover:text-white sm:block">
              <PictureInPicture2 className="h-4 w-4" />
            </button>
            <button onClick={toggleFullscreen} aria-label="Fullscreen" className="rounded p-1.5 text-mist transition hover:bg-white/10 hover:text-white">
              <Maximize className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Active Cast Status Banner */}
        {isCasting && (
          <div className="flex items-center justify-between border-t border-accent/30 bg-accent/10 px-4 py-2 text-xs text-accent">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
              <span>Casting video and audio to <strong>{castDevice || "Smart TV"}</strong></span>
            </span>
            <button
              onClick={requestCast}
              className="rounded-lg border border-accent/40 bg-accent/20 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-accent/30"
            >
              Disconnect
            </button>
          </div>
        )}

        {/* source status row */}
        <div className="flex flex-wrap items-center gap-2 border-t border-white/5 px-3 py-2 text-xs text-mist">
          <Gauge className="h-3.5 w-3.5" />
          <span className="text-slate-300">Server: {source.label}</span>
          {subtitleName && (
            <span className="text-accent">· Subtitles: {subtitleName}</span>
          )}
          {hasMoreSources && <span>· Backup: {resolved.length - sourceIndex - 1} server(s)</span>}
          <button
            onClick={reportBrokenLink}
            className="ml-auto flex items-center gap-1 rounded border border-white/10 px-2 py-1 transition hover:border-neon/50 hover:text-neon"
          >
            <Flag className="h-3 w-3" />
            Report Broken Link
          </button>
        </div>
      </div>
    </div>
  );
}