"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  Eye,
  Film,
  Globe,
  Heart,
  Layers,
  Pencil,
  Play,
  Radio,
  RefreshCw,
  Sparkles,
  Star,
  Tv,
  User,
  Video,
  FolderPlus,
} from "lucide-react";
import type { Media, SeriesSeason } from "@/lib/types";
import { openGhostPlayer } from "@/lib/utils/ghostPlayer";
import { useFavorites } from "@/lib/hooks/useFavorites";
import TrailerModal from "@/components/media/TrailerModal";
import AddToCollectionModal from "@/components/media/AddToCollectionModal";
import { useUiStore } from "@/lib/store";

interface SeriesDetailViewProps {
  media: Media;
  canEdit: boolean;
  onEdit: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

function formatDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.round(seconds / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m > 0 ? `${m}m` : ""}`;
  }
  return `${mins}m`;
}

export default function SeriesDetailView({
  media,
  canEdit,
  onEdit,
  onRefresh,
  refreshing,
}: SeriesDetailViewProps) {
  const seasons = media.seasons || [];
  const openLightbox = useUiStore((s) => s.openLightbox);
  const openContextMenu = useUiStore((s) => s.openContextMenu);
  const [selectedSeasonNum, setSelectedSeasonNum] = useState<number>(
    seasons[0]?.seasonNumber || 1,
  );
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const { isFav, toggle } = useFavorites();
  const isFavorite = isFav(media.id);

  const activeSeason = seasons.find((s) => s.seasonNumber === selectedSeasonNum) || seasons[0];
  const totalEpisodesCount = seasons.reduce((acc, s) => acc + (s.episodes?.length || 0), 0);

  const extra = (media.extraMeta || {}) as {
    schedule?: string;
    officialSite?: string;
    imdbId?: string;
    seriesStatus?: string;
  };

  const firstEpisode = activeSeason?.episodes?.[0] || seasons[0]?.episodes?.[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/library/series"
          className="inline-flex items-center gap-2 text-sm text-mist transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Series Vault
        </Link>
        {canEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent transition hover:bg-accent/20"
          >
            <Pencil className="h-4 w-4" />
            Edit Series & Streams
          </button>
        )}
      </div>

      {/* Series Hero Backdrop */}
      <div className="glass relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
        {media.backdropUrl ? (
          <Image
            src={media.backdropUrl}
            alt=""
            fill
            unoptimized
            sizes="100vw"
            className="object-cover object-top opacity-40 filter brightness-90 contrast-105"
            priority
          />
        ) : (
          <div className="h-96 w-full bg-gradient-to-br from-neon/20 via-obsidian/80 to-obsidian" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian/90 via-obsidian/50 to-transparent" />

        {/* Hero Content */}
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:p-10">
          {/* Series Poster */}
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
            <div className="absolute top-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-neon border border-neon/30 backdrop-blur-md">
              SERIES
            </div>
          </div>

          {/* Details & Actions */}
          <div className="flex-1 space-y-3">
            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              {media.network && (
                <span className="flex items-center gap-1.5 rounded-md bg-neon/20 border border-neon/40 px-2.5 py-0.5 font-bold uppercase tracking-wider text-neon shadow-neon-pink">
                  <Radio className="h-3 w-3" />
                  {media.network}
                </span>
              )}
              {seasons.length > 0 && (
                <span className="flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-0.5 text-white/90">
                  <Layers className="h-3 w-3 text-accent" />
                  {seasons.length} {seasons.length === 1 ? "Season" : "Seasons"} ({totalEpisodesCount} Ep)
                </span>
              )}
              {media.year ? (
                <span className="flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-0.5 text-white/90">
                  <Calendar className="h-3 w-3 text-mist" />
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
                  Original Name: {media.altTitles.en}
                </p>
              )}
            </div>

            {/* Schedule string */}
            {extra.schedule && (
              <p className="flex items-center gap-2 text-xs text-mist border-l-2 border-neon pl-3">
                <Clock className="h-3 w-3 text-neon" />
                <span>Broadcast Schedule: {extra.schedule}</span>
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              {firstEpisode ? (
                <Link
                  href={`/watch/${media.id}?season=${firstEpisode.season || activeSeason?.seasonNumber || 1}&episode=${firstEpisode.episodeNumber || 1}`}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon to-accent px-6 py-3 text-sm font-bold text-obsidian shadow-neon-pink transition hover:brightness-110 active:scale-95"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Play S{activeSeason?.seasonNumber || 1}:E{firstEpisode.episodeNumber || 1}
                </Link>
              ) : (
                <Link
                  href={`/watch/${media.id}`}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon to-accent px-6 py-3 text-sm font-bold text-obsidian shadow-neon-pink transition hover:brightness-110"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Play Episode
                </Link>
              )}

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
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 hover:border-white/30"
              >
                <Film className="h-4 w-4 text-accent" />
                Ghost Mode
              </button>

              {media.trailerUrl && (
                <button
                  type="button"
                  onClick={() => setTrailerOpen(true)}
                  className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                >
                  <Video className="h-4 w-4 text-neon" />
                  Trailer
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

              {canEdit && onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                  title="Refresh metadata"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Season & Episode Guide (The Crown Jewel for Series) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-white flex items-center gap-2.5">
              <Tv className="h-5 w-5 text-neon" />
              Episodes & Season Guide
            </h2>
            <p className="text-xs text-mist mt-0.5">
              Browse all episodes, view synopses, and stream with 1-click playback
            </p>
          </div>

          {/* Season Switcher Tabs */}
          {seasons.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {seasons.map((s) => {
                const isActive = s.seasonNumber === selectedSeasonNum;
                return (
                  <button
                    key={s.seasonNumber}
                    onClick={() => setSelectedSeasonNum(s.seasonNumber)}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                      isActive
                        ? "bg-neon text-obsidian shadow-neon-pink"
                        : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    Season {s.seasonNumber} ({s.episodes?.length || 0} Ep)
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Episode Cards Grid with Internal Scroll Container */}
        {activeSeason && activeSeason.episodes && activeSeason.episodes.length > 0 ? (
          <div className="max-h-[640px] overflow-y-auto pr-2 rounded-2xl border border-white/[0.08] bg-black/20 p-3 shadow-inner scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 hover:scrollbar-thumb-neon/40">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {activeSeason.episodes.map((ep) => {
                const durStr = formatDuration(ep.duration);
                return (
                  <div
                    key={ep.id}
                    className="glass card-surface group flex flex-col overflow-hidden rounded-2xl border border-white/10 transition duration-200 hover:border-neon/40 hover:bg-white/[0.04]"
                  >
                    {/* Episode Thumbnail */}
                    <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                      {ep.thumbnailUrl ? (
                        <Image
                          src={ep.thumbnailUrl}
                          alt={ep.title}
                          fill
                          unoptimized
                          sizes="400px"
                          className="object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : media.backdropUrl ? (
                        <Image
                          src={media.backdropUrl}
                          alt=""
                          fill
                          unoptimized
                          sizes="400px"
                          className="object-cover opacity-60"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-white/5 text-xs text-mist">
                          No Thumbnail
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-80" />

                      {/* Play Button Overlay */}
                      <Link
                        href={`/watch/${media.id}?season=${activeSeason.seasonNumber}&episode=${ep.episodeNumber}`}
                        className="absolute inset-0 grid place-items-center bg-obsidian/40 opacity-0 transition group-hover:opacity-100"
                      >
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-neon text-obsidian shadow-neon-pink">
                          <Play className="h-6 w-6 fill-current translate-x-0.5" />
                        </div>
                      </Link>

                      {/* Badges on Thumbnail */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className="rounded bg-black/80 backdrop-blur-md px-2 py-0.5 text-[11px] font-bold text-neon border border-neon/30">
                          S{activeSeason.seasonNumber} : E{ep.episodeNumber}
                        </span>
                      </div>

                      {durStr && (
                        <div className="absolute bottom-2 right-2 rounded bg-black/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-white flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5 text-accent" />
                          {durStr}
                        </div>
                      )}
                    </div>

                    {/* Episode Details */}
                    <div className="flex flex-1 flex-col justify-between p-4 space-y-2.5">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-white group-hover:text-neon transition">
                            {ep.episodeNumber}. {ep.title}
                          </h3>
                        </div>
                        {ep.airdate && (
                          <p className="text-[11px] text-mist flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            Aired: {ep.airdate}
                          </p>
                        )}
                        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-300">
                          {ep.overview || "No overview available for this episode."}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-[11px] text-mist">
                          {ep.sources && ep.sources.length > 0
                            ? `${ep.sources.length} stream server${ep.sources.length > 1 ? "s" : ""}`
                            : "Default Master Stream"}
                        </span>
                        <Link
                          href={`/watch/${media.id}?season=${activeSeason.seasonNumber}&episode=${ep.episodeNumber}`}
                          className="flex items-center gap-1 text-xs font-bold text-neon hover:text-white transition"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          Watch Episode
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="glass card-surface p-8 text-center text-sm text-mist">
            No structured episodes found for Season {selectedSeasonNum}. You can add episodes or stream directly using the player above.
          </div>
        )}
      </div>

      {/* Main Grid: Overview + Cast on Left, Facts on Right */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column (2 Cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Series Overview */}
          <div className="glass card-surface p-6 space-y-3">
            <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
              <Film className="h-4 w-4 text-accent" />
              Series Synopsis
            </h2>
            <p className="text-sm leading-relaxed text-slate-300">
              {media.overview || "No synopsis available for this series."}
            </p>
          </div>

          {/* Series Regular Cast */}
          {((media.castDetails && media.castDetails.length > 0) || (media.actors && media.actors.length > 0)) && (
            <div className="glass card-surface p-6 space-y-4">
              <h2 className="font-display text-base font-bold text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4 text-accent" />
                  Series Cast & Characters
                </span>
                <span className="text-xs text-mist font-normal">
                  {media.castDetails?.length || media.actors.length} members
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {media.castDetails && media.castDetails.length > 0 ? (
                  media.castDetails.map((cast, idx) => (
                    <Link
                      key={idx}
                      href={`/actress/${encodeURIComponent(cast.name)}`}
                      className="group flex flex-col items-center rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center transition hover:border-neon/40 hover:bg-white/5 hover:scale-[1.02]"
                    >
                      <div className="relative mb-2 h-16 w-16 overflow-hidden rounded-full border border-white/10 shadow-md group-hover:border-neon transition">
                        {cast.avatarUrl ? (
                          <Image
                            src={cast.avatarUrl}
                            alt={cast.name}
                            fill
                            unoptimized
                            sizes="64px"
                            className="object-cover group-hover:scale-110 transition duration-300"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-white/10 text-xs font-bold text-white group-hover:bg-neon/20 group-hover:text-neon">
                            {cast.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <p className="line-clamp-1 text-xs font-bold text-white group-hover:text-neon transition">{cast.name}</p>
                      {cast.character && (
                        <p className="line-clamp-1 text-[11px] text-mist">{cast.character}</p>
                      )}
                    </Link>
                  ))
                ) : (
                  media.actors.map((actor, idx) => (
                    <Link
                      key={idx}
                      href={`/actress/${encodeURIComponent(actor)}`}
                      className="group flex flex-col items-center rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center transition hover:border-neon/40 hover:bg-white/5 hover:scale-[1.02]"
                    >
                      <div className="relative mb-2 h-16 w-16 overflow-hidden rounded-full border border-white/10 shadow-md group-hover:border-neon transition">
                        <div className="grid h-full w-full place-items-center bg-white/10 text-xs font-bold text-white group-hover:bg-neon/20 group-hover:text-neon">
                          {actor.slice(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <p className="line-clamp-1 text-xs font-bold text-white group-hover:text-neon transition">{actor}</p>
                      <p className="line-clamp-1 text-[11px] text-mist">Cast</p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column / Sidebar */}
        <aside className="space-y-6">
          {/* Series Facts Box */}
          <div className="glass card-surface p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-white">Series Information</h2>
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <dt className="text-mist">Format</dt>
                <dd className="font-semibold text-neon">Television Series</dd>
              </div>
              {media.network && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-mist">Network / Platform</dt>
                  <dd className="font-semibold text-right max-w-[60%] truncate">
                    <Link
                      href={`/search?studio=${encodeURIComponent(media.network)}`}
                      className="text-accent hover:underline"
                      title={`Browse titles by ${media.network}`}
                    >
                      {media.network}
                    </Link>
                  </dd>
                </div>
              )}
              {extra.seriesStatus && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-mist">Status</dt>
                  <dd className="font-semibold text-accent">{extra.seriesStatus}</dd>
                </div>
              )}
              {media.year ? (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-mist">Release Year</dt>
                  <dd className="font-semibold text-white">{media.year}</dd>
                </div>
              ) : null}
              {seasons.length > 0 && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-mist">Seasons / Episodes</dt>
                  <dd className="font-semibold text-white">
                    {seasons.length} Seasons, {totalEpisodesCount} Episodes
                  </dd>
                </div>
              )}
              {media.country && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-mist">Country</dt>
                  <dd className="font-semibold text-white">{media.country}</dd>
                </div>
              )}
              {extra.officialSite && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-mist">Official Website</dt>
                  <dd>
                    <a
                      href={extra.officialSite}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:text-white flex items-center gap-1 font-semibold"
                    >
                      Visit <ExternalLink className="h-3 w-3" />
                    </a>
                  </dd>
                </div>
              )}
              {extra.imdbId && (
                <div className="flex justify-between pb-1">
                  <dt className="text-mist">IMDb Profile</dt>
                  <dd>
                    <a
                      href={`https://www.imdb.com/title/${extra.imdbId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-300 hover:text-white flex items-center gap-1 font-semibold"
                    >
                      View on IMDb <ExternalLink className="h-3 w-3" />
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Genres & Tags */}
          <div className="glass card-surface p-6 space-y-3">
            <h2 className="font-display text-base font-bold text-white">Genres & Tags</h2>
            <div className="flex flex-wrap gap-1.5">
              {media.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition hover:border-neon hover:text-neon"
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