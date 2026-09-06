"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  Film,
  Heart,
  Layers,
  Pencil,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  User,
  Video,
  X,
  Download,
  FolderPlus,
  Magnet,
  Send,
} from "lucide-react";
import type { Media, MediaSource } from "@/lib/types";
import { openGhostPlayer } from "@/lib/utils/ghostPlayer";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { useUiStore } from "@/lib/store";
import { extractAndTranslateActress } from "@/lib/utils/translate";
import TrailerModal from "@/components/media/TrailerModal";
import MediaRow from "@/components/home/MediaRow";
import AddToCollectionModal from "@/components/media/AddToCollectionModal";

interface JavDetailViewProps {
  media: Media;
  canEdit: boolean;
  onEdit: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function JavDetailView({
  media,
  canEdit,
  onEdit,
  onRefresh,
  refreshing,
}: JavDetailViewProps) {
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [failedImgs, setFailedImgs] = useState<Record<string, boolean>>({});
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [copiedMagnetIdx, setCopiedMagnetIdx] = useState<number | null>(null);
  const [actressWorks, setActressWorks] = useState<Media[]>([]);
  const [seriesWorks, setSeriesWorks] = useState<Media[]>([]);
  const { isFav, toggle } = useFavorites();
  const pushToast = useUiStore((s) => s.pushToast);
  const openLightbox = useUiStore((s) => s.openLightbox);
  const openContextMenu = useUiStore((s) => s.openContextMenu);
  const isFavorite = isFav(media.id);

  const extra = (media.extraMeta || {}) as {
    label?: string;
    maker?: string;
    series?: string;
    seriesName?: string;
    previewImages?: string[];
    javdbId?: string;
    censored?: boolean;
    magnets?: Array<{ title: string; size?: string; magnet: string; isSubtitled: boolean; date?: string }>;
  };

  const seriesTitle = extra.seriesName || extra.series;

  const primaryActress = media.castDetails?.[0]?.name || media.actors?.[0];
  const { nameEn: primaryActressEn } = extractAndTranslateActress(primaryActress || "");

  // Load other works in the same Franchise Series and by the actress
  useEffect(() => {
    // 1. Fetch series/franchise works from media API
    fetch(`/api/media/${encodeURIComponent(media.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.seriesWorks && Array.isArray(d.seriesWorks)) {
          setSeriesWorks(d.seriesWorks);
        }
      })
      .catch(() => {});

    // 2. Load other works by the same actress
    if (!primaryActressEn) return;
    fetch(`/api/actresses/${encodeURIComponent(primaryActressEn)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.works && Array.isArray(d.works)) {
          setActressWorks(d.works.filter((w: Media) => w.id !== media.id));
        }
      })
      .catch(() => {});
  }, [primaryActressEn, media.id]);

  const handleSendToQb = async (magnet: string) => {
    try {
      const res = await fetch("/api/admin/torrent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_torrent", magnet, category: "JAV" }),
      });
      const data = await res.json();
      if (res.ok) {
        pushToast("Torrent sent to qBittorrent on Orange Pi!", "success");
      } else {
        pushToast(data.error || "Failed to send to qBittorrent", "error");
      }
    } catch {
      pushToast("Could not connect to qBittorrent server", "error");
    }
  };

  const handleCopyMagnet = (magnet: string, idx: number) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(magnet);
      setCopiedMagnetIdx(idx);
      setTimeout(() => setCopiedMagnetIdx(null), 2000);
      pushToast("Magnet link copied to clipboard", "info");
    }
  };

  const rawPreviewImages: string[] =
    extra.previewImages && extra.previewImages.length > 0
      ? extra.previewImages
      : media.backdropUrl
      ? [media.backdropUrl]
      : [];

  const previewImages = rawPreviewImages.filter(
    (url) =>
      typeof url === "string" &&
      (url.startsWith("http") || url.startsWith("/")) &&
      !url.includes("/v/") &&
      !failedImgs[url],
  );

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIdx === null) return;
    setLightboxIdx((lightboxIdx - 1 + previewImages.length) % previewImages.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIdx === null) return;
    setLightboxIdx((lightboxIdx + 1) % previewImages.length);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/library/jav"
          className="inline-flex items-center gap-2 text-sm text-mist transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to JAV Vault
        </Link>
        {canEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-2 rounded-lg border border-neon/40 bg-neon/10 px-4 py-2 text-sm text-neon transition hover:bg-neon/20"
          >
            <Pencil className="h-4 w-4" />
            Edit JAV & Streams
          </button>
        )}
      </div>

      {/* Cover Jacket & Hero Banner */}
      <div className="glass relative overflow-hidden rounded-3xl border border-neon/20 shadow-2xl shadow-neon/10">
        {media.backdropUrl ? (
          <Image
            src={media.backdropUrl}
            alt=""
            fill
            unoptimized
            sizes="100vw"
            className="object-cover object-center opacity-40 filter blur-sm brightness-90"
            priority
          />
        ) : (
          <div className="h-96 w-full bg-gradient-to-br from-neon/20 via-obsidian/80 to-obsidian" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian/95 via-obsidian/60 to-transparent" />

        {/* Hero Content */}
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:p-10">
          {/* Cover Jacket with Neon Halo */}
          <div
            onClick={() => media.posterUrl && openLightbox(media.posterUrl, `${media.title} - Cover`)}
            onContextMenu={(e) => {
              e.preventDefault();
              openContextMenu({
                x: e.clientX,
                y: e.clientY,
                imageSrc: media.posterUrl || undefined,
                media,
                title: `${media.title} (Cover)`,
              });
            }}
            className="relative h-72 w-52 shrink-0 overflow-hidden rounded-2xl border-2 border-neon/40 shadow-neon-pink sm:h-96 sm:w-64 group bg-obsidian cursor-pointer"
            title="Click to zoom, right click for menu"
          >
            {media.posterUrl ? (
              <Image
                src={media.posterUrl}
                alt={media.title}
                fill
                unoptimized
                sizes="256px"
                className="object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-neon/10 p-4 text-center font-display text-sm font-bold text-white/80">
                {media.title}
              </div>
            )}
            {media.code && (
              <div className="absolute top-2 left-2 rounded bg-black/80 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-neon border border-neon/50 backdrop-blur-md">
                {media.code}
              </div>
            )}
            <div className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/40 backdrop-blur-md flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              {extra.censored !== false ? "Censored" : "Uncensored"}
            </div>
          </div>

          {/* Details & Action Hub */}
          <div className="flex-1 space-y-3">
            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="rounded-md bg-neon px-2.5 py-0.5 font-bold uppercase tracking-wider text-white shadow-neon-pink">
                JAV 18+
              </span>

              {/* Glowing Code with 1-Click Copy */}
              {media.code && (
                <button
                  type="button"
                  onClick={() => handleCopyCode(media.code!)}
                  className="flex items-center gap-1.5 rounded-md border border-neon/60 bg-neon/15 px-2.5 py-0.5 font-mono font-bold text-neon transition hover:bg-neon/30 active:scale-95 shadow-sm"
                  title="Click to copy release code"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>{media.code}</span>
                    </>
                  )}
                </button>
              )}

              {media.runtime && media.runtime > 0 && (
                <span className="flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-0.5 text-white/90">
                  <Clock className="h-3 w-3 text-neon" />
                  {media.runtime} min
                </span>
              )}

              {media.releaseDate && (
                <span className="flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-0.5 text-white/90">
                  <Calendar className="h-3 w-3 text-accent" />
                  {media.releaseDate}
                </span>
              )}

              {typeof media.rating === "number" && (
                <span className="flex items-center gap-1 rounded-md bg-amber-500/20 px-2.5 py-0.5 font-bold text-amber-300 border border-amber-500/30">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {media.rating.toFixed(1)}
                </span>
              )}

              <span className="flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-0.5 text-mist">
                <Eye className="h-3 w-3" />
                {media.views.toLocaleString()} views
              </span>
            </div>

            {/* Title */}
            <div>
              <h1 className="font-display text-2xl font-black tracking-tight text-white sm:text-4xl leading-snug">
                {media.title}
              </h1>
              {media.altTitles?.ja && media.altTitles.ja !== media.title && (
                <p className="mt-1 text-sm font-medium text-slate-400">
                  {media.altTitles.ja}
                </p>
              )}
            </div>

            {/* Quick Maker & Director Line */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
              {extra.maker && (
                <span>
                  Studio: <strong className="text-white">{extra.maker}</strong>
                </span>
              )}
              {extra.label && (
                <span>
                  Label: <strong className="text-white">{extra.label}</strong>
                </span>
              )}
              {media.director && (
                <span>
                  Director: <strong className="text-white">{media.director}</strong>
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link
                href={`/watch/${media.id}`}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon via-pink-600 to-accent px-6 py-3 text-sm font-bold text-white shadow-neon-pink transition hover:brightness-110 active:scale-95"
              >
                <Play className="h-4 w-4 fill-current" />
                Watch Full Video
              </Link>

              <button
                type="button"
                onClick={() =>
                  openGhostPlayer({
                    title: media.title,
                    sources: media.sources,
                    mediaId: media.id,
                    year: media.year,
                    type: media.type,
                  })
                }
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 hover:border-white/30"
              >
                <Film className="h-4 w-4 text-neon" />
                Ghost Mode
              </button>

              {media.trailerUrl && (
                <button
                  type="button"
                  onClick={() => setTrailerOpen(true)}
                  className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                >
                  <Video className="h-4 w-4 text-accent" />
                  Sample Preview
                </button>
              )}

              <button
                type="button"
                onClick={() => toggle(media.id)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  isFavorite
                    ? "border-pink-500/50 bg-pink-500/10 text-pink-300"
                    : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
                title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? "fill-current text-pink-500" : ""}`} />
                <span>{isFavorite ? "Favorited" : "Favorite"}</span>
              </button>

              <button
                type="button"
                onClick={() => setCollectionModalOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                title="Add to Collection / Custom Playlist"
              >
                <FolderPlus className="h-4 w-4 text-accent" />
                <span>Collection</span>
              </button>

              {canEdit && onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                  title="Refresh metadata from JAVDB"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-neon" : ""}`} />
                  <span>Refresh</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Spec Sheet & Actresses & Streaming */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left 2 Columns: Spec Sheet & Gallery & Overview */}
        <div className="space-y-8 lg:col-span-2">
          {/* Technical Specifications Card (Spec Sheet) */}
          <div className="glass rounded-2xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center gap-2 text-neon">
              <Layers className="h-5 w-5" />
              <h2 className="font-display text-lg font-bold text-white">
                Vault Technical Specifications
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
              <div className="rounded-xl bg-white/[0.03] p-3.5 border border-white/5">
                <span className="text-xs text-mist block mb-1">Release Code (ID)</span>
                <span className="font-mono font-bold text-neon">{media.code || "N/A"}</span>
              </div>

              <div className="rounded-xl bg-white/[0.03] p-3.5 border border-white/5">
                <span className="text-xs text-mist block mb-1">Release Date</span>
                <span className="font-semibold text-white">{media.releaseDate || "Unknown"}</span>
              </div>

              <div className="rounded-xl bg-white/[0.03] p-3.5 border border-white/5">
                <span className="text-xs text-mist block mb-1">Duration</span>
                <span className="font-semibold text-white">
                  {media.runtime ? `${media.runtime} minutes` : "Unknown"}
                </span>
              </div>

              <div className="rounded-xl bg-white/[0.03] p-3.5 border border-white/5">
                <span className="text-xs text-mist block mb-1">Maker / Studio</span>
                {extra.maker || media.studio ? (
                  <Link
                    href={`/search?studio=${encodeURIComponent(extra.maker || media.studio || "")}`}
                    className="font-semibold text-accent hover:underline"
                    title={`Browse all titles by ${extra.maker || media.studio}`}
                  >
                    {extra.maker || media.studio}
                  </Link>
                ) : (
                  <span className="font-semibold text-white">Unknown</span>
                )}
              </div>

              <div className="rounded-xl bg-white/[0.03] p-3.5 border border-white/5">
                <span className="text-xs text-mist block mb-1">Label</span>
                {extra.label ? (
                  <Link
                    href={`/search?studio=${encodeURIComponent(extra.label)}`}
                    className="font-semibold text-accent hover:underline"
                    title={`Browse all titles under ${extra.label}`}
                  >
                    {extra.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-white">Unknown</span>
                )}
              </div>

              <div className="rounded-xl bg-white/[0.03] p-3.5 border border-white/5">
                <span className="text-xs text-mist block mb-1">Director</span>
                <span className="font-semibold text-white">{media.director || "Unknown"}</span>
              </div>

              {extra.series && (
                <div className="col-span-2 sm:col-span-3 rounded-xl bg-white/[0.03] p-3.5 border border-white/5">
                  <span className="text-xs text-mist block mb-1">Series</span>
                  <span className="font-semibold text-white">{extra.series}</span>
                </div>
              )}
            </div>
          </div>

          {/* Preview Scenes Screenshot Gallery */}
          {previewImages.length > 0 && (
            <div className="glass rounded-2xl border border-white/10 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-neon">
                  <Sparkles className="h-5 w-5" />
                  <h2 className="font-display text-lg font-bold text-white">
                    Preview Scene Stills
                  </h2>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-mist">
                    {previewImages.length}
                  </span>
                </div>
                <span className="text-xs text-mist">Click image to expand full view</span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {previewImages.map((imgUrl, idx) => (
                  <button
                    key={imgUrl || idx}
                    type="button"
                    onClick={() => setLightboxIdx(idx)}
                    className="group relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/40 transition hover:border-neon/60 hover:shadow-neon-pink focus:outline-none"
                  >
                    <Image
                      src={imgUrl}
                      alt={`Preview scene ${idx + 1}`}
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition duration-300 group-hover:scale-105"
                      onError={() => {
                        setFailedImgs((prev) => ({ ...prev, [imgUrl]: true }));
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 transition duration-300 group-hover:bg-black/20" />
                    <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-mono text-white/80 opacity-0 transition group-hover:opacity-100">
                      #{idx + 1}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Story / Synopsis Overview */}
          {media.overview && (
            <div className="glass rounded-2xl border border-white/10 p-6 space-y-3">
              <h2 className="font-display text-lg font-bold text-white">Synopsis</h2>
              <p className="leading-relaxed text-slate-300 text-sm sm:text-base">
                {media.overview}
              </p>
            </div>
          )}

          {/* Tags & Categories Cloud */}
          {media.tags && media.tags.length > 0 && (
            <div className="glass rounded-2xl border border-white/10 p-6 space-y-3">
              <div className="flex items-center gap-2 text-neon">
                <Tag className="h-4 w-4" />
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-mist">
                  Tags & Classifications
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {media.tags.map((tag, idx) => (
                  <Link
                    key={idx}
                    href={`/library/jav?q=${encodeURIComponent(tag)}`}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:border-neon/50 hover:bg-neon/10 hover:text-white"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Column: Starring Actresses & Streaming Servers */}
        <div className="space-y-6">
          {/* Starring Actresses Showcase */}
          <div className="glass rounded-2xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-neon">
                <User className="h-5 w-5" />
                <h2 className="font-display text-lg font-bold text-white">
                  Starring Actresses
                </h2>
              </div>
            </div>

            {media.castDetails && media.castDetails.length > 0 ? (
              <div className="space-y-3">
                {media.castDetails.map((cast, idx) => {
                  const { nameEn, nameJa } = extractAndTranslateActress(cast.name);
                  const displayNameEn = nameEn || cast.name;
                  const displayNameJa = nameJa && nameJa !== displayNameEn ? nameJa : (cast.character && cast.character !== cast.name ? cast.character : undefined);

                  return (
                    <Link
                      key={idx}
                      href={`/actress/${encodeURIComponent(displayNameEn)}`}
                      className="group flex items-center gap-3.5 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 transition hover:border-neon/40 hover:bg-neon/10"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white/10 group-hover:border-neon transition">
                        {cast.profileUrl || cast.avatarUrl ? (
                          <Image
                            src={cast.profileUrl || cast.avatarUrl!}
                            alt={displayNameEn}
                            fill
                            unoptimized
                            sizes="56px"
                            className="object-cover group-hover:scale-110 transition duration-300"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-neon/20 text-neon font-bold text-sm">
                            {displayNameEn.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white group-hover:text-neon transition truncate text-sm">
                          {displayNameEn}
                        </p>
                        {displayNameJa && (
                          <p className="text-xs text-rose-300/90 font-medium truncate mt-0.5">
                            🇯🇵 {displayNameJa}
                          </p>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] text-mist group-hover:text-neon/80 mt-1">
                          View Works <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (media.actors && media.actors.length > 0) ? (
              <div className="space-y-2">
                {media.actors.map((actress, idx) => {
                  const { nameEn, nameJa } = extractAndTranslateActress(actress);
                  const displayNameEn = nameEn || actress;
                  const displayNameJa = nameJa && nameJa !== displayNameEn ? nameJa : undefined;

                  return (
                    <Link
                      key={idx}
                      href={`/actress/${encodeURIComponent(displayNameEn)}`}
                      className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2.5 transition hover:border-neon/40 hover:bg-neon/10"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-white group-hover:text-neon text-sm block truncate">
                          {displayNameEn}
                        </span>
                        {displayNameJa && (
                          <span className="text-xs text-rose-300/90 font-medium block truncate mt-0.5">
                            🇯🇵 {displayNameJa}
                          </span>
                        )}
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-mist group-hover:text-neon shrink-0 ml-2" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-mist italic">No actress information listed.</p>
            )}
          </div>

          {/* Streaming Sources & Servers */}
          <div className="glass rounded-2xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center gap-2 text-accent">
              <Server className="h-5 w-5" />
              <h2 className="font-display text-lg font-bold text-white">
                Playback Servers
              </h2>
            </div>

            {media.sources && media.sources.length > 0 ? (
              <div className="space-y-2.5">
                {media.sources.map((src: MediaSource, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3 transition hover:border-white/20"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-medium text-white text-sm truncate">
                        {src.label || `Server ${idx + 1}`}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-mist mt-0.5">
                        <span className="uppercase text-neon font-bold">{src.kind || src.type || "hls"}</span>
                        {src.quality && (
                          <span className="rounded bg-white/10 px-1.5 py-0.2 font-mono text-[10px] text-slate-300">
                            {src.quality}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        href={`/watch/${media.id}`}
                        className="rounded-lg bg-neon/20 px-3 py-1.5 text-xs font-bold text-neon transition hover:bg-neon hover:text-white"
                      >
                        Play
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          openGhostPlayer({
                            title: media.title,
                            sources: [src],
                            mediaId: media.id,
                            year: media.year,
                            type: media.type,
                          })
                        }
                        className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-mist transition hover:bg-white/10 hover:text-white"
                        title="Watch in Ghost Player"
                      >
                        <Film className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-mist">
                No active streaming links yet. Use &ldquo;Edit JAV & Streams&rdquo; above to add stream URLs.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Magnets & Torrent Downloads Section */}
      {extra.magnets && extra.magnets.length > 0 && (
        <div className="glass rounded-2xl border border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-neon">
              <Magnet className="h-5 w-5" />
              <h2 className="font-display text-lg font-bold text-white">
                Magnet & Torrent Downloads ({extra.magnets.length})
              </h2>
            </div>
            <span className="text-xs text-mist hidden sm:inline">
              Click to copy magnet or send directly to Orange Pi qBittorrent
            </span>
          </div>

          <div className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
            {extra.magnets.map((mag, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center justify-between gap-3 p-3.5 transition hover:bg-white/[0.04]"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white text-sm break-all">{mag.title}</p>
                    {mag.isSubtitled && (
                      <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                        💬 Subtitled
                      </span>
                    )}
                    {mag.size && (
                      <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-300">
                        {mag.size}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyMagnet(mag.magnet, idx)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:border-white/30 hover:bg-white/10"
                    title="Copy magnet link"
                  >
                    {copiedMagnetIdx === idx ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Magnet</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendToQb(mag.magnet)}
                    className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent transition hover:bg-accent/20"
                    title="Send directly to qBittorrent on Orange Pi"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send to qBittorrent</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Franchise / Series Collection Carousel */}
      {seriesWorks.length > 0 && (
        <div className="pt-2">
          <MediaRow
            title={`More in "${seriesTitle || "Franchise Series"}" (${seriesWorks.length})`}
            accent="cyan"
            items={seriesWorks}
          />
        </div>
      )}

      {/* More Starring Actress Carousel */}
      {actressWorks.length > 0 && (
        <div className="pt-2">
          <MediaRow
            title={`More Starring ${primaryActressEn} (${actressWorks.length})`}
            accent="pink"
            items={actressWorks}
          />
        </div>
      )}

      {/* Lightbox Modal for Preview Scene Stills */}
      {lightboxIdx !== null && previewImages[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Top Lightbox Bar */}
          <div
            className="absolute top-4 inset-x-4 flex items-center justify-between text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 font-mono text-sm bg-black/60 px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-neon font-bold">{media.code || "JAV"}</span>
              <span className="text-mist">•</span>
              <span>
                Still {lightboxIdx + 1} of {previewImages.length}
              </span>
            </div>
            <button
              onClick={() => setLightboxIdx(null)}
              className="rounded-lg border border-white/20 bg-black/60 p-2 text-white transition hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Main Fullscreen Image */}
          <div
            className="relative max-h-[80vh] max-w-5xl w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {previewImages[lightboxIdx] ? (
              <Image
                src={previewImages[lightboxIdx]}
                alt={`Preview scene ${lightboxIdx + 1}`}
                fill
                unoptimized
                sizes="90vw"
                className="object-contain"
                onError={() => {
                  const broken = previewImages[lightboxIdx];
                  if (broken) {
                    setFailedImgs((prev) => ({ ...prev, [broken]: true }));
                  }
                }}
              />
            ) : null}

            {/* Prev Button */}
            {previewImages.length > 1 && (
              <button
                type="button"
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/70 p-3 text-white transition hover:bg-neon hover:text-white shadow-lg"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Next Button */}
            {previewImages.length > 1 && (
              <button
                type="button"
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/70 p-3 text-white transition hover:bg-neon hover:text-white shadow-lg"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          {previewImages.length > 1 && (
            <div
              className="absolute bottom-4 inset-x-4 flex items-center justify-center gap-2 overflow-x-auto py-2 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {previewImages.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightboxIdx(i)}
                  className={`relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    i === lightboxIdx ? "border-neon scale-105" : "border-white/20 opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img}
                    alt=""
                    fill
                    unoptimized
                    sizes="96px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add to Collection Modal */}
      <AddToCollectionModal
        open={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        mediaId={media.id}
        mediaTitle={media.title}
      />

      {/* Trailer Modal */}
      {media.trailerUrl && (
        <TrailerModal
          trailerUrl={media.trailerUrl}
          title={media.title}
          open={trailerOpen}
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </div>
  );
}