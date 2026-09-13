"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Check,
  Flag,
  Play,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { MediaCardSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUiStore } from "@/lib/store";
import { deleteMedia, fetchMediaById, refetchMedia, updateMedia } from "@/lib/api/client";
import type { Media, MediaSource } from "@/lib/types";
import { isFirebaseConfigured } from "@/lib/firebase";
import MovieDetailView from "@/components/media/MovieDetailView";
import SeriesDetailView from "@/components/media/SeriesDetailView";
import JavDetailView from "@/components/media/JavDetailView";
import ActressAutocompleteInput from "@/components/media/ActressAutocompleteInput";

const STATUS_OPTIONS = ["draft", "published", "flagged"] as const;

export default function MediaDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { user } = useAuth();
  const pushToast = useUiStore((s) => s.pushToast);

  const [media, setMedia] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const canEdit = user?.isAdmin ?? false;

  const load = useCallback(async () => {
    setLoading(true);
    const m = await fetchMediaById(id);
    setMedia(m);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <MediaCardSkeleton />
      </div>
    );
  }

  if (!media) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/library" className="inline-flex items-center gap-2 text-sm text-mist transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Link>
        <EmptyState
          title="Media not found in vault"
          description={
            isFirebaseConfigured
              ? `Media id "${id}" was not found.`
              : `No media with id "${id}" exists — go to library to search and save media items.`
          }
        />
        <div className="glass card-surface flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-slate-200">Test the video player directly</p>
            <p className="text-xs text-mist">Uses public test stream (no mock data)</p>
          </div>
          <Link
            href={`/watch/${id}`}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-neon px-4 py-2 text-sm font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110"
          >
            <Play className="h-4 w-4 fill-current" />
            Test Player
          </Link>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <EditForm
        media={media}
        onCancel={() => setEditing(false)}
        onSaved={(m) => {
          setMedia(m);
          setEditing(false);
        }}
      />
    );
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await refetchMedia(media.id);
      setMedia(res.media);
      pushToast("Fetched latest metadata from provider", "success");
    } catch (e) {
      pushToast((e as Error).message, "error");
    } finally {
      setRefreshing(false);
    }
  };

  if (media.type === "movie") {
    return (
      <MovieDetailView
        media={media}
        canEdit={canEdit}
        onEdit={() => setEditing(true)}
        onRefresh={media.tmdbId ? handleRefresh : undefined}
        refreshing={refreshing}
      />
    );
  }

  if (media.type === "series") {
    return (
      <SeriesDetailView
        media={media}
        canEdit={canEdit}
        onEdit={() => setEditing(true)}
        onRefresh={media.tvmazeId ? handleRefresh : undefined}
        refreshing={refreshing}
      />
    );
  }

  if (media.type === "jav" || media.isAdult) {
    return (
      <JavDetailView
        media={media}
        canEdit={canEdit}
        onEdit={() => setEditing(true)}
        onRefresh={(media.code || media.id.startsWith("jav-")) ? handleRefresh : undefined}
        refreshing={refreshing}
      />
    );
  }

  return (
    <MovieDetailView
      media={media}
      canEdit={canEdit}
      onEdit={() => setEditing(true)}
      onRefresh={handleRefresh}
      refreshing={refreshing}
    />
  );
}

// ── Edit form: fields + sources + tags + actresses ─────────────────────────

interface EditFormProps {
  media: Media;
  onCancel: () => void;
  onSaved: (m: Media) => void;
}

function EditForm({ media, onCancel, onSaved }: EditFormProps) {
  const router = useRouter();
  const pushToast = useUiStore((s) => s.pushToast);
  const requestConfirm = useUiStore((s) => s.requestConfirm);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(media.title);
  const [titleTh, setTitleTh] = useState(media.altTitles?.th ?? "");
  const [overview, setOverview] = useState(media.overview ?? "");
  const [year, setYear] = useState(media.year ? String(media.year) : "");
  const [country, setCountry] = useState(media.country);
  const [studio, setStudio] = useState(media.studio ?? "");
  const [rating, setRating] = useState(typeof media.rating === "number" ? String(media.rating) : "");
  const [trailerUrl, setTrailerUrl] = useState(media.trailerUrl ?? "");
  const [director, setDirector] = useState(media.director ?? "");
  const [runtime, setRuntime] = useState(media.runtime ? String(media.runtime) : "");
  const [tagline, setTagline] = useState(media.tagline ?? "");
  const [releaseDate, setReleaseDate] = useState(media.releaseDate ?? "");
  const [network, setNetwork] = useState(media.network ?? "");
  const [status, setStatus] = useState<Media["status"]>(media.status);
  const [tags, setTags] = useState(media.tags.join(", "));
  const [actresses, setActresses] = useState<string[]>(media.actors);
  const [sources, setSources] = useState<MediaSource[]>(media.sources);

  const save = async () => {
    setBusy(true);
    try {
      const res = await updateMedia(media.id, {
        title,
        titleTh,
        overview,
        year: year ? Number(year) : undefined,
        country,
        studio,
        director,
        runtime: runtime ? Number(runtime) : undefined,
        tagline,
        releaseDate,
        network,
        rating: rating ? Number(rating) : undefined,
        trailerUrl,
        status,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        sources: sources.map((s) => ({ label: s.label, url: s.url, kind: s.kind ?? "hls" })),
        actresses,
      });
      pushToast("Saved successfully", "success");
      onSaved(res.media);
    } catch (e) {
      pushToast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const removeMedia = async () => {
    const ok = await requestConfirm({
      title: `ลบ "${media.title}"`,
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้และไฟล์ทั้งหมดที่เกี่ยวข้องออกจากคลังข้อมูล? การกระทำนี้ไม่สามารถเรียกคืนได้`,
      confirmText: "ลบรายการทันที",
      cancelText: "ยกเลิก",
      kind: "danger",
    });
    if (!ok) return;

    try {
      await deleteMedia(media.id);
      pushToast("Deleted successfully", "success");
      window.location.href = media.type === "jav" ? "/library/jav" : media.type === "series" ? "/library/series" : "/library/movies";
    } catch (e) {
      pushToast((e as Error).message, "error");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-white">Edit: {media.title}</h1>
        <button onClick={onCancel} className="text-sm text-mist transition hover:text-white">
          Cancel
        </button>
      </div>

      <div className="glass card-surface grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Alternative Title">
          <input value={titleTh} onChange={(e) => setTitleTh(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Year">
          <input value={year} onChange={(e) => setYear(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Country">
          <input value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Director">
          <input value={director} onChange={(e) => setDirector(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Runtime (minutes)">
          <input value={runtime} onChange={(e) => setRuntime(e.target.value)} className={inputCls} placeholder="e.g. 120" />
        </Field>
        <Field label="Release Date">
          <input value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className={inputCls} placeholder="YYYY-MM-DD" />
        </Field>
        <Field label="Studio / Maker">
          <input value={studio} onChange={(e) => setStudio(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Network (for Series)">
          <input value={network} onChange={(e) => setNetwork(e.target.value)} className={inputCls} placeholder="e.g. Netflix, HBO" />
        </Field>
        <Field label="Tagline">
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputCls} placeholder="Catchphrase or tagline" />
        </Field>
        <Field label="Rating">
          <input value={rating} onChange={(e) => setRating(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Trailer URL">
          <input value={trailerUrl} onChange={(e) => setTrailerUrl(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Media["status"])}
            className={inputCls}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Tags (comma separated)">
            <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Synopsis">
            <textarea value={overview} onChange={(e) => setOverview(e.target.value)} rows={4} className={inputCls} />
          </Field>
        </div>
      </div>

      {/* sources editor */}
      <div className="glass card-surface p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-sm font-bold tracking-wide text-white">
              Streaming Links / Video Sources ({sources.length})
            </h2>
            <p className="text-xs text-mist mt-0.5">
              รองรับลิงก์สตรีมแบบ Embed (เช่น Turbovid, JavHD Embed, Playmogo) หรือ HLS (.m3u8)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSources((arr) => [...arr, { label: `Server ${arr.length + 1}`, url: "", kind: "embed" }])}
            className="flex items-center gap-1.5 rounded-lg bg-accent/20 border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/30"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Server
          </button>
        </div>

        {sources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-mist">
            ยังไม่มีเซิร์ฟเวอร์สตรีมมิ่ง กด &quot;Add Server&quot; เพื่อเพิ่มลิงก์วิดีโอ (เช่น Embed iframe หรือ .m3u8)
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((s, i) => (
              <div key={i} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                <input
                  value={s.label}
                  onChange={(e) => setSources((arr) => arr.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  placeholder="Server Name (e.g. JavHD Embed)"
                  className={`${inputCls} sm:w-44 text-xs`}
                />
                <select
                  value={s.kind ?? "embed"}
                  onChange={(e) =>
                    setSources((arr) =>
                      arr.map((x, j) => (j === i ? { ...x, kind: e.target.value as MediaSource["kind"] } : x)),
                    )
                  }
                  className={`${inputCls} sm:w-28 text-xs`}
                >
                  <option value="embed">Embed (Iframe)</option>
                  <option value="hls">HLS (.m3u8)</option>
                  <option value="local">Local File</option>
                  <option value="other">Other</option>
                </select>
                <input
                  value={s.url}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSources((arr) =>
                      arr.map((x, j) => {
                        if (j !== i) return x;
                        // Auto-detect kind if not explicitly set
                        let detectedKind = x.kind;
                        const lower = val.toLowerCase();
                        if (lower.endsWith(".m3u8")) detectedKind = "hls";
                        else if (lower.includes("/embed") || lower.includes("/e/") || lower.includes("/t/") || lower.includes("playmogo") || lower.includes("turbovid") || lower.includes("javhd")) detectedKind = "embed";
                        return { ...x, url: val, kind: detectedKind };
                      })
                    );
                  }}
                  placeholder="https://... (Embed URL or .m3u8)"
                  className={`${inputCls} flex-1 font-mono text-xs`}
                />
                <button
                  type="button"
                  onClick={() => setSources((arr) => arr.filter((_, j) => j !== i))}
                  className="self-center sm:self-auto rounded-lg border border-white/10 p-2 text-mist transition hover:border-red-400/50 hover:text-red-300"
                  aria-label="Delete"
                  title="Remove server"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* actresses editor — syncs to actress pages */}
      <div className="glass card-surface p-5 space-y-3">
        <h2 className="font-display text-sm font-bold tracking-wide text-white">
          Cast & Actresses ({actresses.length})
        </h2>
        <ActressAutocompleteInput
          selected={actresses}
          onChange={setActresses}
          placeholder="Search existing actress/cast or type new name to add..."
        />
        <p className="text-xs text-mist">
          Names added will automatically register in the database and appear in actress profiles.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-neon px-5 py-2.5 text-sm font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {busy ? "Saving…" : "Save Changes"}
        </button>
        <Link
          href={`/watch/${media.id}`}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/5"
        >
          <Play className="h-4 w-4" />
          Test Play
        </Link>
        <button
          onClick={removeMedia}
          className="ml-auto flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-mist transition hover:border-red-400/50 hover:text-red-300"
        >
          <Trash2 className="h-4 w-4" />
          Delete Media
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-accent/60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-mist">{label}</label>
      {children}
    </div>
  );
}