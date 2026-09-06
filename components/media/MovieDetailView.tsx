"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Coins,
  DollarSign,
  Eye,
  Film,
  Heart,
  Pencil,
  Play,
  RefreshCw,
  Sparkles,
  Star,
  Tv,
  User,
  Video,
  X,
  FolderPlus,
} from "lucide-react";
import type { Media } from "@/lib/types";
import { openGhostPlayer } from "@/lib/utils/ghostPlayer";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { useUiStore } from "@/lib/store";
import TrailerModal from "@/components/media/TrailerModal";
import AddToCollectionModal from "@/components/media/AddToCollectionModal";

interface MovieDetailViewProps {
  media: Media;
  canEdit: boolean;
  onEdit: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

function formatRuntime(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ""}`;
  return `${m}m`;
}

function formatCurrency(amount?: unknown): string | null {
  if (typeof amount !== "number" || amount <= 0) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function MovieDetailView({
  media,
  canEdit,
  onEdit,
  onRefresh,
  refreshing,
}: MovieDetailViewProps) {
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const openLightbox = useUiStore((s) => s.openLightbox);
  const openContextMenu = useUiStore((s) => s.openContextMenu);
  const { isFav, toggle } = useFavorites();
  const isFavorite = isFav(media.id);

  const extra = (media.extraMeta || {}) as {
    budget?: number;
    revenue?: number;
    productionCompanies?: Array<{ name: string; logoUrl?: string }>;
  };

  const budgetStr = formatCurrency(extra.budget);
  const revenueStr = formatCurrency(extra.revenue);
  const runtimeStr = formatRuntime(media.runtime);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/library/movies"
          className="inline-flex items-center gap-2 text-sm text-mist transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Movies Vault
        </Link>
        {canEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent transition hover:bg-accent/20"
          >
            <Pencil className="h-4 w-4" />
            Edit Movie & Streams
          </button>
        )}
      </div>

      {/* Cinematic Hero Backdrop */}
      <div className="glass relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
        {media.backdropUrl ? (
          <Image
            src={media.backdropUrl}
            alt=""
            fill
            unoptimized
            sizes="100vw"
            className="object-cover object-top opacity-50 filter brightness-90 contrast-105"
            priority
          />
        ) : (
          <div className="h-96 w-full bg-gradient-to-br from-accent/20 via-obsidian/80 to-obsidian" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian/90 via-obsidian/40 to-transparent" />

        {/* Hero Content */}
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:p-10">
          {/* Movie Poster with Glow */}
          <div
            onClick={() => media.posterUrl && openLightbox(media.posterUrl, `${media.title} - Poster`)}
            onContextMenu={(e) => {
              e.preventDefault();
              openContextMenu({
                x: e.clientX,
                y: e.clientY,
                imageSrc: media.posterUrl || undefined,
                media,
                title: `${media.title} (Poster)`,
              });
            }}
            className="relative h-64 w-44 shrink-0 overflow-hidden rounded-2xl border border-white/20 shadow-2xl sm:h-80 sm:w-56 group cursor-pointer"
            title="Click to zoom, right click for menu"
          >
            {media.posterUrl ? (
              <Image
                src={media.posterUrl}
                alt={media.title}
                fill
                unoptimized
                sizes="224px"
                className="object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-white/5 p-4 text-center font-display text-sm font-bold text-white/80">
                {media.title}
              </div>
            )}
            <div className="absolute top-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-accent border border-accent/30 backdrop-blur-md">
              4K MASTER
            </div>
          </div>

          {/* Details & Actions */}
          <div className="flex-1 space-y-3">
            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="rounded-md bg-accent px-2 py-0.5 font-bold uppercase tracking-wider text-obsidian shadow-neon-cyan">
                MOVIE
              </span>
              {runtimeStr && (
                <span className="flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-0.5 text-white/90">
                  <Clock className="h-3 w-3 text-accent" />
                  {runtimeStr}
                </span>
              )}
              {media.releaseDate ? (
                <span className="flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-0.5 text-white/90">
                  <Calendar className="h-3 w-3 text-neon" />
                  {media.releaseDate}
                </span>
              ) : media.year ? (
                <span className="rounded-md bg-white/10 px-2.5 py-0.5 text-white/90">
                  {media.year}
                </span>
              ) : null}
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
              <h1 className="font-display text-3xl font-black tracking-tight text-white sm:text-5xl">
                {media.title}
              </h1>
              {media.altTitles?.en && media.altTitles.en !== media.title && (
                <p className="mt-1 text-sm font-medium text-mist">
                  Original Title: {media.altTitles.en}
                </p>
              )}
            </div>

            {/* Tagline */}
            {media.tagline && (
              <p className="italic text-slate-300 text-sm sm:text-base border-l-2 border-accent pl-3">
                &ldquo;{media.tagline}&rdquo;
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
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
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-neon px-6 py-3 text-sm font-bold text-obsidian shadow-neon-cyan transition hover:brightness-110 active:scale-95"
              >
                <Play className="h-4 w-4 fill-current" />
                Watch (Ghost Mode)
              </button>

              <Link
                href={`/watch/${media.id}`}
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 hover:border-white/30"
              >
                <Film className="h-4 w-4 text-accent" />
                Open in Video Player
              </Link>

              {media.trailerUrl && (
                <button
                  type="button"
                  onClick={() => setTrailerOpen(true)}
                  className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                >
                  <Video className="h-4 w-4 text-neon" />
                  Watch Trailer
                </button>
              )}

              <button
                type="button"
                onClick={() => toggle(media.id)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  isFavorite
                    ? "border-red-500/50 bg-red-500/10 text-red-300"
                    : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
                title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? "fill-current text-red-500" : ""}`} />
                <span>{isFavorite ? "Favorited" : "Favorite"}</span>
              </button>

              <button
                type="button"
                onClick={() => setCollectionOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                title="Add to Custom Collection"
              >
                <FolderPlus className="h-4 w-4 text-neon" />
                <span>Collection</span>
              </button>

              {canEdit && media.tmdbId && onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                  title="Refresh metadata from TMDB"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Storyline + Cast + Gallery on Left, Facts & Sources on Right */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column (2 Cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Storyline Card */}
          <div className="glass card-surface p-6 space-y-3">
            <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
              <Film className="h-4 w-4 text-accent" />
              Storyline & Synopsis
            </h2>
            <p className="text-sm leading-relaxed text-slate-300">
              {media.overview || "No synopsis available for this title."}
            </p>
          </div>

          {/* Key People / Director */}
          {(media.director || (media.crewDetails && media.crewDetails.length > 0)) && (
            <div className="glass card-surface p-6 space-y-4">
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <User className="h-4 w-4 text-neon" />
                Key Filmmakers & Crew
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {media.director && (
                  <div className="flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/5 p-3.5">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/20 text-accent font-bold text-sm">
                      DIR
                    </div>
                    <div>
                      <p className="text-xs text-mist">Director</p>
                      <p className="text-sm font-semibold text-white">{media.director}</p>
                    </div>
                  </div>
                )}
                {media.crewDetails
                  ?.filter((c) => c.role !== "Director")
                  .slice(0, 3)
                  .map((crew, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 text-mist font-bold text-xs">
                        {crew.role.slice(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs text-mist">{crew.role}</p>
                        <p className="text-sm font-semibold text-white">{crew.name}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Featured Cast Cards with Avatars */}
          {media.castDetails && media.castDetails.length > 0 && (
            <div className="glass card-surface p-6 space-y-4">
              <h2 className="font-display text-base font-bold text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4 text-accent" />
                  Top Cast & Characters
                </span>
                <span className="text-xs text-mist font-normal">
                  {media.castDetails.length} members
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {media.castDetails.map((cast, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center transition hover:border-accent/40 hover:bg-white/5"
                  >
                    <div className="relative mb-2 h-16 w-16 overflow-hidden rounded-full border border-white/10 shadow-md">
                      {cast.avatarUrl ? (
                        <Image
                          src={cast.avatarUrl}
                          alt={cast.name}
                          fill
                          unoptimized
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-white/10 text-xs font-bold text-white">
                          {cast.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p className="line-clamp-1 text-xs font-bold text-white">{cast.name}</p>
                    {cast.character && (
                      <p className="line-clamp-1 text-[11px] text-mist">{cast.character}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Movie Stills & Photo Gallery */}
          {media.previewImages && media.previewImages.length > 0 && (
            <div className="glass card-surface p-6 space-y-4">
              <h2 className="font-display text-base font-bold text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-neon" />
                  Movie Stills & Backdrop Gallery
                </span>
                <span className="text-xs text-mist">{media.previewImages.length} images</span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {media.previewImages.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => openLightbox(img, `${media.title} - Still ${i + 1}`)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      openContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        imageSrc: img,
                        media,
                        title: `${media.title} (Still ${i + 1})`,
                      });
                    }}
                    className="group relative aspect-video cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-black/40 transition hover:border-neon"
                    title="Click to zoom, right click for menu"
                  >
                    <Image
                      src={img}
                      alt=""
                      fill
                      unoptimized
                      sizes="300px"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 transition group-hover:opacity-100 grid place-items-center text-white text-xs font-semibold">
                      Click to Expand
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column / Sidebar */}
        <aside className="space-y-6">
          {/* Movie Facts Box */}
          <div className="glass card-surface p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-white">Movie Information</h2>
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <dt className="text-mist">Format</dt>
                <dd className="font-semibold text-accent">Feature Film (4K)</dd>
              </div>
              {media.releaseDate && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-mist">Theatrical Release</dt>
                  <dd className="font-semibold text-white">{media.releaseDate}</dd>
                </div>
              )}
              {runtimeStr && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-mist">Runtime</dt>
                  <dd className="font-semibold text-white">{runtimeStr}</dd>
                </div>
              )}
              {budgetStr && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-mist flex items-center gap-1">
                    <Coins className="h-3 w-3" /> Budget
                  </dt>
                  <dd className="font-semibold text-white">{budgetStr}</dd>
                </div>
              )}
              {revenueStr && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-mist flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Box Office Revenue
                  </dt>
                  <dd className="font-semibold text-green-400">{revenueStr}</dd>
                </div>
              )}
              {media.studio && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-mist">Studio / Production</dt>
                  <dd className="font-semibold text-right max-w-[60%] truncate">
                    <Link
                      href={`/search?studio=${encodeURIComponent(media.studio)}`}
                      className="text-accent hover:underline"
                      title={`Browse titles by ${media.studio}`}
                    >
                      {media.studio}
                    </Link>
                  </dd>
                </div>
              )}
              <div className="flex justify-between border-b border-white/5 pb-2">
                <dt className="text-mist">Country</dt>
                <dd className="font-semibold text-white">{media.country}</dd>
              </div>
              <div className="flex justify-between pb-1">
                <dt className="text-mist">Vault Status</dt>
                <dd className="font-semibold uppercase text-accent">{media.status}</dd>
              </div>
            </dl>
          </div>

          {/* Streaming Servers */}
          <div className="glass card-surface p-6 space-y-3">
            <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
              <Tv className="h-4 w-4 text-accent" />
              Streaming Servers
            </h2>
            {media.sources.length > 0 ? (
              <div className="space-y-2 text-xs">
                {media.sources.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-accent/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                      <div>
                        <p className="font-semibold text-white">{s.label}</p>
                        <p className="text-[11px] text-mist uppercase">{s.kind || "HLS"}</p>
                      </div>
                    </div>
                    <Link
                      href={`/watch/${media.id}`}
                      className="rounded-lg bg-accent/15 border border-accent/30 px-3 py-1 text-xs font-semibold text-accent hover:bg-accent hover:text-obsidian transition"
                    >
                      Stream
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-mist">No stream sources attached yet.</p>
            )}
          </div>

          {/* Genres & Tags */}
          <div className="glass card-surface p-6 space-y-3">
            <h2 className="font-display text-base font-bold text-white">Genres & Tags</h2>
            <div className="flex flex-wrap gap-1.5">
              {media.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition hover:border-accent hover:text-accent"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Trailer Modal */}
      <TrailerModal
        isOpen={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        trailerUrl={media.trailerUrl}
        title={media.title}
      />



      {/* Add To Collection Modal */}
      <AddToCollectionModal
        mediaId={media.id}
        mediaTitle={media.title}
        open={collectionOpen}
        onClose={() => setCollectionOpen(false)}
      />
    </div>
  );
}