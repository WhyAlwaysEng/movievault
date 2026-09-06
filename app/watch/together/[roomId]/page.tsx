"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { Copy, MessageSquare, Pause, Play, Send, Share2, Users, Volume2, VolumeX } from "lucide-react";
import { useUiStore } from "@/lib/store";

interface RoomMessage {
  id: string;
  user: string;
  text: string;
  timestamp: number;
}

interface RoomData {
  roomId: string;
  mediaId: string;
  title: string;
  streamUrl: string;
  currentTime: number;
  paused: boolean;
  viewers: Record<string, { name: string; lastSeen: number }>;
  messages: RoomMessage[];
}

export default function WatchTogetherPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const pushToast = useUiStore((s) => s.pushToast);

  const [viewerName, setViewerName] = useState("Viewer");
  const [viewerId] = useState(() => "v-" + Math.random().toString(36).slice(2, 8));
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [inputText, setInputText] = useState("");
  const [isMuted, setIsMuted] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isBroadcastingRef = useRef(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Initialize viewer name from local storage
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("mv:user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser) as { email?: string };
        if (parsed.email) setViewerName(parsed.email.split("@")[0]);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Poll room state every 2 seconds
  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (!res.ok) return;
      const data = (await res.json()) as RoomData;
      setRoomData(data);

      const video = videoRef.current;
      if (video && !isBroadcastingRef.current) {
        // Sync pause state
        if (data.paused && !video.paused) {
          video.pause();
        } else if (!data.paused && video.paused) {
          video.play().catch(() => {});
        }
        // Sync time drift if > 2.5 seconds
        if (Math.abs(video.currentTime - data.currentTime) > 2.5) {
          video.currentTime = data.currentTime;
        }
      }
    } catch {
      /* ignore network poll errors */
    }
  }, [roomId]);

  useEffect(() => {
    void fetchRoom();
    const interval = setInterval(fetchRoom, 2000);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  // Send heartbeat / sync
  const sendSync = async (paused: boolean, currentTime: number) => {
    isBroadcastingRef.current = true;
    try {
      await fetch(`/api/rooms/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync",
          viewerId,
          viewerName,
          currentTime,
          paused,
        }),
      });
    } finally {
      setTimeout(() => {
        isBroadcastingRef.current = false;
      }, 500);
    }
  };

  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    void sendSync(false, video.currentTime);
  };

  const handlePause = () => {
    const video = videoRef.current;
    if (!video) return;
    void sendSync(true, video.currentTime);
  };

  const handleSeeked = () => {
    const video = videoRef.current;
    if (!video) return;
    void sendSync(video.paused, video.currentTime);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    try {
      await fetch(`/api/rooms/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          viewerId,
          viewerName,
          message: text.trim(),
        }),
      });
      setInputText("");
      void fetchRoom();
    } catch {
      pushToast("Failed to send message", "error");
    }
  };

  const copyRoomLink = () => {
    if (typeof window !== "undefined") {
      void navigator.clipboard.writeText(window.location.href);
      pushToast("Room link copied to clipboard — share with friends to watch together!", "success");
    }
  };

  const viewersCount = roomData ? Object.keys(roomData.viewers).length : 1;

  return (
    <div className="space-y-6">
      {/* Room Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">
              Watch Together Room
            </span>
          </div>
          <h1 className="mt-1 font-display text-xl font-bold text-white">
            {roomData?.title || "Watch Together"}
          </h1>
          <p className="text-xs text-mist">
            Room ID: <span className="font-mono text-slate-300">{roomId}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
            <Users className="h-3.5 w-3.5 text-accent" />
            <span>{Math.max(1, viewersCount)} watching</span>
          </div>
          <button
            onClick={copyRoomLink}
            className="flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share Room Link</span>
          </button>
        </div>
      </div>

      {/* Grid: Left Player, Right Synced Chat */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="glass-strong overflow-hidden rounded-2xl border border-white/10 bg-black shadow-glass">
            <video
              ref={videoRef}
              src={roomData?.streamUrl || "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"}
              className="aspect-video w-full"
              controls
              playsInline
              onPlay={handlePlay}
              onPause={handlePause}
              onSeeked={handleSeeked}
            />
          </div>

          <div className="flex items-center justify-between px-2 text-xs text-mist">
            <span>⚡ Playback controls (Play / Pause / Seek) synchronize live with everyone in the room</span>
            <button
              onClick={() => {
                const video = videoRef.current;
                if (video) {
                  video.muted = !video.muted;
                  setIsMuted(video.muted);
                }
              }}
              className="flex items-center gap-1 text-slate-300 hover:text-white"
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              <span>{isMuted ? "Unmute" : "Mute"}</span>
            </button>
          </div>
        </div>

        {/* Live Synchronized Room Chat */}
        <div className="glass card-surface flex h-[460px] flex-col rounded-2xl border border-white/10 p-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <MessageSquare className="h-4 w-4 text-accent" />
              <span>Room Chat</span>
            </div>
            <span className="text-[11px] text-mist">
              You: <span className="font-semibold text-slate-200">{viewerName}</span>
            </span>
          </div>

          {/* Messages scroll pane */}
          <div ref={chatScrollRef} className="flex-1 space-y-2.5 overflow-y-auto py-3 pr-1 text-xs">
            {roomData?.messages.map((m) => (
              <div key={m.id} className="rounded-lg bg-white/[0.03] p-2.5 border border-white/5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`font-semibold ${m.user === "System" ? "text-accent" : "text-neon"}`}>
                    {m.user}
                  </span>
                  <span className="text-mist/70">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="mt-1 text-slate-200 leading-relaxed break-words">{m.text}</p>
              </div>
            ))}
          </div>

          {/* Quick Emoji Reactions */}
          <div className="flex items-center gap-1.5 py-2 border-t border-white/5">
            {["🍿", "🔥", "👏", "😂", "❤️", "🚀"].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendMessage(emoji)}
                className="rounded-lg bg-white/5 px-2 py-1 text-sm transition hover:bg-white/15"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Chat input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(inputText);
            }}
            className="flex items-center gap-2 pt-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-xl border border-white/10 bg-obsidian/80 px-3 py-2 text-xs text-white placeholder:text-mist focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="grid h-8 w-8 place-items-center rounded-xl bg-accent text-obsidian transition hover:brightness-110 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
