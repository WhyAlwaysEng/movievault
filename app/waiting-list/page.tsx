"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Globe,
  Inbox,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  Tv,
  X,
  Zap,
} from "lucide-react";
import { useUiStore } from "@/lib/store";
import { openGhostPlayer } from "@/lib/utils/ghostPlayer";
import type { MediaSource } from "@/lib/types";

interface ServerInfo {
  label: string;
  url: string;
  kind: "embed" | "hls";
  host?: string;
}

interface InspectResult {
  exists: boolean;
  inWaitingList: boolean;
  code?: string;
  title?: string;
  posterUrl?: string | null;
  overview?: string | null;
  sourceUrl?: string;
  type?: string;
  servers?: ServerInfo[];
  serversCount?: number;
  existingMedia?: {
    id: string;
    title: string;
    code?: string;
    type?: string;
    posterUrl?: string | null;
  };
  message?: string;
}

interface WaitingItem {
  id: string;
  code: string | null;
  title: string;
  source_url: string;
  poster_url: string | null;
  overview: string | null;
  type: string;
  status: string;
  created_at: number;
  servers: ServerInfo[];
}

export default function WaitingListPage() {
  const pushToast = useUiStore((s) => s.pushToast);
  const requestConfirm = useUiStore((s) => s.requestConfirm);
  const queryClient = useQueryClient();

  const [inputUrl, setInputUrl] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [inspectResult, setInspectResult] = useState<InspectResult | null>(null);

  // Fetch Waiting List items
  const { data, isLoading, refetch } = useQuery<{ items: WaitingItem[]; count: number }>({
    queryKey: ["waiting-list"],
    queryFn: async () => {
      const res = await fetch("/api/waiting-list");
      if (!res.ok) throw new Error("Failed to fetch waiting list");
      return res.json();
    },
  });

  const waitingItems = data?.items ?? [];

  // Inspect link handler
  const handleInspect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetUrl = inputUrl.trim();
    if (!targetUrl) return;

    setInspecting(true);
    setInspectResult(null);

    try {
      const res = await fetch("/api/media/inspect-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const json = await res.json();

      if (!res.ok) {
        pushToast(json.error || "Failed to inspect link", "error");
      } else {
        setInspectResult(json);
        if (json.exists) {
          pushToast(`รหัส ${json.code} มีอยู่ในระบบแล้ว!`, "info");
        } else if (json.inWaitingList) {
          pushToast(`รหัส ${json.code} อยู่ใน Waiting List แล้ว`, "info");
        } else {
          pushToast(`ตรวจพบ ${json.code || "หนัง"} พร้อม ${json.serversCount || 0} เซิร์ฟเวอร์!`, "success");
        }
      }
    } catch (err: any) {
      pushToast("Error connecting to inspector service", "error");
    } finally {
      setInspecting(false);
    }
  };

  // Add to Waiting List
  const handleAddToWaitingList = async () => {
    if (!inspectResult || inspectResult.exists || inspectResult.inWaitingList) return;

    try {
      const res = await fetch("/api/waiting-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: inspectResult.code,
          title: inspectResult.title,
          sourceUrl: inspectResult.sourceUrl,
          posterUrl: inspectResult.posterUrl,
          overview: inspectResult.overview,
          servers: inspectResult.servers,
          type: inspectResult.type || "jav",
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        pushToast(json.error || "Failed to add to waiting list", "error");
      } else {
        pushToast("เพิ่มลงใน Waiting List เรียบร้อยแล้ว", "success");
        setInspectResult(null);
        setInputUrl("");
        queryClient.invalidateQueries({ queryKey: ["waiting-list"] });
      }
    } catch {
      pushToast("Failed to save to waiting list", "error");
    }
  };

  // Approve single item
  const handleApprove = async (id: string, codeOrTitle?: string | null) => {
    try {
      const res = await fetch("/api/waiting-list/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();

      if (!res.ok) {
        pushToast(json.error || "Failed to approve", "error");
      } else {
        pushToast(`อนุมัติ ${codeOrTitle || "รายการ"} เข้าสู่คลังเรียบร้อยแล้ว!`, "success");
        queryClient.invalidateQueries({ queryKey: ["waiting-list"] });
        queryClient.invalidateQueries({ queryKey: ["media"] });
      }
    } catch {
      pushToast("Error approving item", "error");
    }
  };

  // Approve all
  const handleApproveAll = async () => {
    const ok = await requestConfirm({
      title: "นำเข้าทั้งหมดเข้าสู่คลังหลัก",
      message: `คุณต้องการนำเข้ารายการรอทั้งหมด ${waitingItems.length} รายการเข้าสู่คลังหลักใช่หรือไม่?`,
      confirmText: "ยืนยันนำเข้าทั้งหมด",
      cancelText: "ยกเลิก",
      kind: "info",
    });
    if (!ok) return;

    try {
      const res = await fetch("/api/waiting-list/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approveAll: true }),
      });
      const json = await res.json();

      if (!res.ok) {
        pushToast(json.error || "Failed to approve all", "error");
      } else {
        pushToast(`นำเข้าสำเร็จ ${json.approvedCount} รายการ!`, "success");
        queryClient.invalidateQueries({ queryKey: ["waiting-list"] });
        queryClient.invalidateQueries({ queryKey: ["media"] });
      }
    } catch {
      pushToast("Error approving all items", "error");
    }
  };

  // Delete single item
  const handleDelete = async (id: string, title?: string) => {
    const ok = await requestConfirm({
      title: "ลบออกจาก Waiting List",
      message: `คุณต้องการลบ "${title || 'รายการนี้'}" ออกจาก Waiting List ใช่หรือไม่?`,
      confirmText: "ลบรายการ",
      cancelText: "ยกเลิก",
      kind: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/waiting-list?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        pushToast("ลบออกจาก Waiting List แล้ว", "info");
        queryClient.invalidateQueries({ queryKey: ["waiting-list"] });
      }
    } catch {
      pushToast("Failed to delete item", "error");
    }
  };

  // Clear all
  const handleClearAll = async () => {
    const ok = await requestConfirm({
      title: "ล้าง Waiting List ทั้งหมด",
      message: `คุณต้องการลบรายการใน Waiting List ทั้งหมด ${waitingItems.length} รายการใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      confirmText: "ล้างทั้งหมด",
      cancelText: "ยกเลิก",
      kind: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch("/api/waiting-list?clearAll=true", { method: "DELETE" });
      if (res.ok) {
        pushToast("ล้างรายการทั้งหมดแล้ว", "info");
        queryClient.invalidateQueries({ queryKey: ["waiting-list"] });
      }
    } catch {
      pushToast("Failed to clear list", "error");
    }
  };

  // Preview in Ghost Player
  const handlePreview = (title: string, servers: ServerInfo[]) => {
    if (!servers || servers.length === 0) {
      pushToast("No stream servers available to preview", "error");
      return;
    }

    const playerSources: MediaSource[] = servers.map((s) => ({
      label: s.label,
      url: s.url,
      kind: s.kind,
    }));

    openGhostPlayer({
      title,
      sources: playerSources,
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
            <Clock className="h-4 w-4" />
            <span>Staging & Import Queue</span>
          </div>
          <h1 className="font-display mt-1 text-2xl font-bold text-white sm:text-3xl">
            Waiting List <span className="text-mist text-lg font-normal">({waitingItems.length})</span>
          </h1>
          <p className="mt-1 text-xs text-mist sm:text-sm">
            สแกนลิงก์จากหน้าเว็บ ดึงรหัสเรื่อง เช็คความซ้ำซ้อน ดึงเฟรมเครื่องเล่น & ลิ้งค์สำรองทั้งหมด แล้วรอยืนยันเข้าคลัง
          </p>
        </div>

        {waitingItems.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleApproveAll}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2 text-xs font-semibold text-obsidian shadow-lg transition hover:brightness-110 active:scale-95"
            >
              <Check className="h-4 w-4" />
              อนุมัติทั้งหมด ({waitingItems.length})
            </button>
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-mist transition hover:border-red-500/40 hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
              ล้างคิว
            </button>
          </div>
        )}
      </div>

      {/* URL Inspector Hero Card */}
      <div className="glass-strong relative overflow-hidden rounded-2xl border border-accent/25 p-6 shadow-glass">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Globe className="h-4 w-4 text-accent" />
            <span>Web Link Inspector & Duplicate Checker</span>
          </div>

          <form onSubmit={handleInspect} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="วางลิงก์หน้าเว็บดูหนัง (เช่น https://javx.cc/video/roe-552-...)"
                className="w-full rounded-xl border border-white/10 bg-obsidian/70 px-4 py-3 pl-10 text-sm text-white placeholder-mist/60 outline-none transition focus:border-accent/60 focus:bg-obsidian/90"
              />
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-mist" />
            </div>

            <button
              type="submit"
              disabled={inspecting || !inputUrl.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-neon px-6 py-3 text-sm font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110 disabled:opacity-50"
            >
              {inspecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลังสแกน...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  สแกน & เช็คความซ้ำ
                </>
              )}
            </button>
          </form>

          {/* Preset Quick Test */}
          <div className="flex items-center gap-2 text-xs text-mist">
            <span>ตัวอย่างทดสอบ:</span>
            <button
              type="button"
              onClick={() => {
                setInputUrl("https://javx.cc/video/roe-552-eng-sub-a-tall-former-flight-attendant-married-woman-finally-allowed-to-take-creampies-for-ten-years-until-my-beloved-stepson-grew-taller-than-me-we-stayed-connected-through-sweet-kisses/");
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300 transition hover:border-accent/40 hover:text-accent font-mono text-[11px]"
            >
              ROE-552 (javx.cc)
            </button>
          </div>
        </div>
      </div>

      {/* Inspected Result Preview Card */}
      {inspectResult && (
        <div className="animate-in fade-in slide-in-from-top-3 duration-200">
          {inspectResult.exists ? (
            /* Duplicate in Media */
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-400">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-amber-500/30 px-2 py-0.5 text-xs font-bold font-mono text-amber-300">
                        {inspectResult.code}
                      </span>
                      <h3 className="font-semibold text-white">มีรหัสนี้อยู่ในคลัง MovieVault แล้ว!</h3>
                    </div>
                    <p className="mt-1 text-xs text-amber-200/80">
                      {inspectResult.existingMedia?.title || inspectResult.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/media/${inspectResult.existingMedia?.id}`}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-obsidian transition hover:brightness-110"
                  >
                    <span>เปิดดูในคลัง</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => setInspectResult(null)}
                    className="rounded-xl border border-white/10 p-2 text-mist transition hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : inspectResult.inWaitingList ? (
            /* Already in Waiting List */
            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-500/20 text-sky-400">
                    <Clock className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-sky-500/30 px-2 py-0.5 text-xs font-bold font-mono text-sky-300">
                        {inspectResult.code}
                      </span>
                      <h3 className="font-semibold text-white">รายการนี้อยู่ใน Waiting List เรียบร้อยแล้ว</h3>
                    </div>
                    <p className="mt-1 text-xs text-sky-200/80">กำลังรอการกดยืนยันเข้าคลังที่รายการด้านล่าง</p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectResult(null)}
                  className="rounded-xl border border-white/10 p-2 text-mist transition hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Brand New - Ready to add */
            <div className="glass-strong rounded-2xl border border-emerald-500/30 p-5 shadow-glass">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <Sparkles className="h-4 w-4" />
                  <span>ยังไม่มีในคลัง — ตรวจพบข้อมูลและเซิร์ฟเวอร์ครบถ้วน!</span>
                </div>
                <button
                  onClick={() => setInspectResult(null)}
                  className="text-mist hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-5">
                {/* Poster preview */}
                <div className="relative h-44 w-32 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  {inspectResult.posterUrl ? (
                    <img
                      src={inspectResult.posterUrl}
                      alt={inspectResult.title || "Poster"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs text-mist">
                      No Poster
                    </div>
                  )}
                  {inspectResult.code && (
                    <span className="absolute left-1.5 top-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold font-mono text-neon">
                      {inspectResult.code}
                    </span>
                  )}
                </div>

                {/* Details & Extracted Servers */}
                <div className="flex-1 space-y-3">
                  <h3 className="font-display text-base font-bold text-white line-clamp-2">
                    {inspectResult.title}
                  </h3>

                  {inspectResult.overview && (
                    <p className="text-xs text-mist line-clamp-2 leading-relaxed">
                      {inspectResult.overview}
                    </p>
                  )}

                  {/* Detected Servers list */}
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-accent flex items-center gap-1 mb-1.5">
                      <Server className="h-3 w-3" />
                      เซิร์ฟเวอร์สำรองที่สกัดได้ ({inspectResult.servers?.length || 0} เซิร์ฟเวอร์):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {inspectResult.servers?.map((s, idx) => (
                        <span
                          key={idx}
                          className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {s.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleAddToWaitingList}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-2.5 text-xs font-semibold text-obsidian shadow-lg transition hover:brightness-110"
                    >
                      <Plus className="h-4 w-4" />
                      บันทึกลงใน Waiting List
                    </button>

                    {inspectResult.servers && inspectResult.servers.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          handlePreview(inspectResult.title || "Preview", inspectResult.servers || [])
                        }
                        className="flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2.5 text-xs font-semibold text-accent transition hover:bg-accent/20"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        ทดสอบเล่นเครื่องเล่น (Preview)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Waiting List Queue Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-accent" />
            <h2 className="font-display text-base font-bold text-white">
              รายการที่รอยืนยัน (Pending Queue)
            </h2>
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent">
              {waitingItems.length}
            </span>
          </div>

          <button
            onClick={() => refetch()}
            className="flex items-center gap-1 text-xs text-mist hover:text-white transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            รีเฟรช
          </button>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="mt-2 text-xs text-mist">กำลังโหลดรายการ Waiting List...</p>
          </div>
        ) : waitingItems.length === 0 ? (
          <div className="glass card-surface rounded-2xl p-12 text-center">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-mist">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h3 className="font-display text-sm font-semibold text-white">ไม่มีรายการค้างใน Waiting List</h3>
            <p className="mt-1 text-xs text-mist">
              วางลิงก์หน้าเว็บหนังในช่องค้นหาด้านบน เพื่อสแกนและเพิ่มรายการใหม่เข้ามาได้ตลอดเวลา
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-1">
            {waitingItems.map((item) => (
              <div
                key={item.id}
                className="glass-strong flex flex-col md:flex-row items-start gap-4 rounded-2xl border border-white/10 p-4 transition hover:border-accent/40"
              >
                {/* Poster */}
                <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  {item.poster_url ? (
                    <img
                      src={item.poster_url}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[10px] text-mist">
                      No Poster
                    </div>
                  )}
                  {item.code && (
                    <span className="absolute left-1 top-1 rounded bg-black/80 px-1 py-0.5 text-[9px] font-bold font-mono text-neon">
                      {item.code}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.code && (
                      <span className="rounded bg-neon/20 border border-neon/40 px-2 py-0.5 text-xs font-bold font-mono text-neon">
                        {item.code}
                      </span>
                    )}
                    <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase text-mist font-semibold">
                      {item.type}
                    </span>
                    <span className="text-[11px] text-mist">
                      เพิ่มเมื่อ {new Date(item.created_at).toLocaleDateString("th-TH")}
                    </span>
                  </div>

                  <h3 className="font-display text-sm font-bold text-white line-clamp-2">
                    {item.title}
                  </h3>

                  {item.overview && (
                    <p className="text-xs text-mist line-clamp-1">{item.overview}</p>
                  )}

                  {/* Server tags */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">
                      เซิร์ฟเวอร์ ({item.servers.length}):
                    </span>
                    {item.servers.map((s, idx) => (
                      <span
                        key={idx}
                        className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300"
                      >
                        {s.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-row md:flex-col items-center gap-2 shrink-0 self-end md:self-center w-full md:w-auto justify-end pt-2 md:pt-0">
                  <button
                    onClick={() => handlePreview(item.title, item.servers)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-medium text-accent hover:bg-accent/20 transition"
                    title="เปิดทดสอบเล่นดูเครื่องเล่น"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>Preview</span>
                  </button>

                  <button
                    onClick={() => handleApprove(item.id, item.code || item.title)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2 text-xs font-semibold text-obsidian shadow-md hover:brightness-110 transition active:scale-95"
                    title="นำเข้าสู่คลังหลักทันที"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>ยืนยันเข้าคลัง</span>
                  </button>

                  <button
                    onClick={() => handleDelete(item.id, item.title)}
                    className="rounded-xl border border-white/10 p-2 text-mist hover:border-red-500/40 hover:text-red-300 transition"
                    title="ลบออกจาก Waiting List"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
