"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Film,
  Play,
  Signal,
  Tv,
} from "lucide-react";
import VideoPlayer from "@/components/player/VideoPlayer";
import EmptyState from "@/components/ui/EmptyState";
import { fetchMediaById } from "@/lib/api/client";
import { isFinished, loadResume } from "@/lib/utils/playback";
import type { Media, MediaSource, SeriesEpisode } from "@/lib/types";
import { openGhostPlayer } from "@/lib/utils/ghostPlayer";

function WatchContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params.id;

  const [media, setMedia] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);

  const seasonParam = searchParams.get("season");
  const episodeParam = searchParams.get("episode");
  const seasonNum = seasonParam ? parseInt(seasonParam, 10) : null;
  const episodeNum = episodeParam ? parseInt(episodeParam, 10) : null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMediaById(id).then((m) => {
      if (!cancelled) {
        setMedia(m);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const isSeries = media?.type === "series";

  // Find active season and episode for series
  const activeSeason = isSeries && media.seasons && media.seasons.length > 0
    ? (seasonNum ? media.seasons.find((s) => s.seasonNumber === seasonNum) || media.seasons[0] : media.seasons[0])
    : null;

  const activeEpisode = activeSeason && activeSeason.episodes && activeSeason.episodes.length > 0
    ? (episodeNum ? activeSeason.episodes.find((ep) => ep.episodeNumber === episodeNum) || activeSeason.episodes[0] : activeSeason.episodes[0])
    : null;

  // Flatten all episodes for next / prev navigation
  const allEpisodes: Array<{ season: number; episode: SeriesEpisode }> = [];
  if (isSeries && media.seasons) {
    media.seasons.forEach((s) => {
      s.episodes.forEach((ep) => {
        allEpisodes.push({ season: s.seasonNumber, episode: ep });
      });
    });
  }

  const currentIdx = activeEpisode
    ? allEpisodes.findIndex(
        (item) =>
          item.season === (activeSeason?.seasonNumber || 1) &&
          item.episode.episodeNumber === activeEpisode.episodeNumber
      )
    : -1;

  const prevItem = currentIdx > 0 ? allEpisodes[currentIdx - 1] : null;
  const nextItem = currentIdx >= 0 && currentIdx < allEpisodes.length - 1 ? allEpisodes[currentIdx + 1] : null;

  // Active sources: if episode has specific sources, use them; otherwise media.sources
  const activeSources: MediaSource[] =
    activeEpisode && activeEpisode.sources && activeEpisode.sources.length > 0
      ? activeEpisode.sources
      : media?.sources || [];

  const playbackId = activeEpisode
    ? `${id}-s${activeSeason?.seasonNumber || 1}e${activeEpisode.episodeNumber}`
    : id;

  const resume = loadResume(playbackId);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={media ? `/media/${media.id}` : "/"}
        className="inline-flex items-center gap-2 text-sm text-mist transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Details
      </Link>

      {/* Header Info */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
            {media && (
              <span
                className={`rounded px-1.5 py-0.5 font-bold uppercase tracking-wider ${
                  media.type === "series"
                    ? "bg-neon text-white"
                    : media.type === "jav"
                    ? "bg-pink-600 text-white"
                    : "bg-accent text-obsidian"
                }`}
              >
                {media.type.toUpperCase()}
              </span>
            )}
            {activeSeason && (
              <span className="rounded bg-white/10 px-2 py-0.5 font-semibold text-white">
                Season {activeSeason.seasonNumber}
              </span>
            )}
            {activeEpisode && (
              <span className="rounded bg-neon/20 text-neon px-2 py-0.5 font-semibold">
                Episode {activeEpisode.episodeNumber}
              </span>
            )}
            {media?.network && (
              <span className="text-mist font-medium">• {media.network}</span>
            )}
          </div>

          <h1 className="font-display text-xl font-bold text-white sm:text-2xl">
            {media?.title ?? `Video: ${id}`}
            {activeEpisode ? ` — ${activeEpisode.name || `Episode ${activeEpisode.episodeNumber}`}` : ""}
          </h1>
          {media && !activeEpisode && (
            <p className="mt-1 text-sm text-mist">
              {media.year ? `${media.year} · ` : ""}{media.country || ""}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {resume && !isFinished(resume.time, resume.duration) && !loading && (
            <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-accent">
              <Signal className="h-3.5 w-3.5" />
              Resume playback available
            </span>
          )}

          <button
            type="button"
            onClick={() =>
              openGhostPlayer({
                title: activeEpisode
                  ? `${media?.title} S${activeSeason?.seasonNumber}E${activeEpisode.episodeNumber}`
                  : media?.title ?? "Video",
                sources: activeSources,
                mediaId: playbackId,
                year: media?.year,
                type: media?.type,
              })
            }
            className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent shadow-neon-cyan transition hover:bg-accent/20 hover:border-accent"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ghost Mode
          </button>
        </div>
      </div>

      {/* Main Video Player */}
      <VideoPlayer key={playbackId} mediaId={playbackId} sources={activeSources} />

      {/* Series Episode Navigation (Next / Previous Controls) */}
      {isSeries && allEpisodes.length > 1 && (
        <div className="glass flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-white/10">
          <div>
            {prevItem ? (
              <Link
                href={`/watch/${id}?season=${prevItem.season}&episode=${prevItem.episode.episodeNumber}`}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>
                  Previous (S{prevItem.season}:E{prevItem.episode.episodeNumber})
                </span>
              </Link>
            ) : (
              <span className="text-xs text-mist italic">First episode</span>
            )}
          </div>

          <div className="text-center text-xs text-mist">
            Episode {currentIdx + 1} of {allEpisodes.length}
          </div>

          <div>
            {nextItem ? (
              <Link
                href={`/watch/${id}?season=${nextItem.season}&episode=${nextItem.episode.episodeNumber}`}
                className="flex items-center gap-2 rounded-lg bg-neon/20 border border-neon/40 px-3 py-2 text-xs font-bold text-neon transition hover:bg-neon hover:text-white"
              >
                <span>
                  Next: S{nextItem.season}:E{nextItem.episode.episodeNumber}
                </span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="text-xs text-mist italic">Season finale</span>
            )}
          </div>
        </div>
      )}

      {/* Active Episode Description */}
      {activeEpisode && (
        <div className="glass card-surface p-5 space-y-2">
          <div className="flex items-center gap-2 text-neon">
            <Tv className="h-4 w-4" />
            <h2 className="font-display text-sm font-bold tracking-wide text-white">
              S{activeSeason?.seasonNumber}:E{activeEpisode.episodeNumber} &ldquo;{activeEpisode.name}&rdquo;
            </h2>
            {activeEpisode.runtime && (
              <span className="flex items-center gap-1 text-xs text-mist ml-auto">
                <Clock className="h-3 w-3" />
                {activeEpisode.runtime} min
              </span>
            )}
          </div>
          {activeEpisode.summary ? (
            <p className="text-sm leading-relaxed text-slate-300">
              {activeEpisode.summary.replace(/<[^>]*>/g, "")}
            </p>
          ) : (
            <p className="text-xs text-mist italic">No episode synopsis available.</p>
          )}
        </div>
      )}

      {/* Episodes Quick Selector for Series */}
      {isSeries && media.seasons && media.seasons.length > 0 && (
        <div className="glass card-surface p-5 space-y-4">
          <h2 className="font-display text-sm font-bold tracking-wide text-white">
            Episode Guide — Season {activeSeason?.seasonNumber || 1}
          </h2>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {activeSeason?.episodes.map((ep) => {
              const isCurrent = ep.episodeNumber === activeEpisode?.episodeNumber;
              return (
                <Link
                  key={ep.id}
                  href={`/watch/${id}?season=${activeSeason.seasonNumber}&episode=${ep.episodeNumber}`}
                  className={`flex items-center gap-3 rounded-xl border p-2.5 transition ${
                    isCurrent
                      ? "border-neon bg-neon/15 shadow-neon-pink"
                      : "border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-black/40">
                    {ep.imageUrl ? (
                      <Image
                        src={ep.imageUrl}
                        alt=""
                        fill
                        unoptimized
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs text-mist">
                        EP {ep.episodeNumber}
                      </div>
                    )}
                    <div className="absolute inset-0 grid place-items-center bg-black/30">
                      <Play className={`h-4 w-4 ${isCurrent ? "fill-neon text-neon" : "fill-white/80 text-white/80"}`} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${isCurrent ? "text-neon" : "text-white"}`}>
                      {ep.episodeNumber}. {ep.name || `Episode ${ep.episodeNumber}`}
                    </p>
                    {ep.runtime && (
                      <span className="text-[10px] text-mist flex items-center gap-1 mt-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {ep.runtime} min
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* About this Title */}
      {media && (
        <div className="glass card-surface p-5">
          <h2 className="font-display mb-2 text-sm font-bold tracking-wide text-white">
            About this Title
          </h2>
          {media.overview ? (
            <p className="text-sm leading-relaxed text-slate-300">{media.overview}</p>
          ) : (
            <p className="text-sm text-mist">No synopsis available.</p>
          )}
          {media.actors && media.actors.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {media.actors.map((actor) => (
                <Link
                  key={actor}
                  href={`/actress/${encodeURIComponent(actor)}`}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200 transition hover:border-accent/50 hover:text-accent"
                >
                  {actor}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="h-8 w-32 rounded bg-white/5 animate-pulse" />
          <div className="aspect-video w-full rounded-2xl bg-white/5 animate-pulse" />
        </div>
      }
    >
      <WatchContent />
    </Suspense>
  );
}