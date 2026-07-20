"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  MoreHorizontal,
  Scissors,
  Share2,
} from "lucide-react";
import { SealCheck } from "@phosphor-icons/react";
import MainLayout from "@/components/layout/mainLayout";
import VideoPlayer from "@/components/auth/videoplayer";
import LikeButton from "@/components/video/likebutton";
import CommentsSection from "@/components/video/commentssection";
import SubscribeButton from "@/components/video/subscribebutton";
import WatchSidebar from "@/components/video/watchsidebar";
import { getVideo, getPlaybackSource } from "@/lib/video";
import { decodeVideoId } from "@/lib/videoId";
import { getCurrentUser } from "@/lib/auth";
import { getCategoryLabel } from "@/lib/categories";

function formatViews(count) {
  const views = Number(count) || 0;
  if (views >= 1_000_000) {
    const value = views / 1_000_000;
    return `${value >= 10 ? Math.round(value) : value.toFixed(1).replace(/\.0$/, "")}M views`;
  }
  if (views >= 1_000) return `${Math.round(views / 1_000)}K views`;
  return `${views} views`;
}

function formatDate(dateString) {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function channelInitial(name) {
  return (name || "?").charAt(0).toUpperCase();
}

export default function WatchPage() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    const videoId = decodeVideoId(id);
    if (!videoId) {
      setError("Video not found");
      return;
    }

    getCurrentUser().then(setUser).catch(() => setUser(null));
    getVideo(videoId)
      .then(setVideo)
      .catch((err) => setError(err.message));
  }, [id]);

  const playbackUrl = video?.playback_url ?? null;
  const playerOptions = useMemo(() => {
    const source = playbackUrl ? getPlaybackSource(playbackUrl) : null;
    return {
      controls: true,
      fluid: true,
      autoplay: true,
      sources: source ? [source] : [],
    };
  }, [playbackUrl]);

  const channelName = video?.uploaded_by || "Unknown channel";
  const categoryLabel = video ? getCategoryLabel(video.category) : null;
  const description = video?.description?.trim() || "";
  const showMore = description.length > 160;
  const canSubscribe =
    video?.user_id && String(user?.id ?? user?.user_id) !== String(video.user_id);

  return (
    <MainLayout>
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-[var(--brand)]"
      >
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      {error && <p className="text-[var(--brand)]">{error}</p>}
      {!video && !error && <p className="text-zinc-500">Loading video...</p>}

      {video && (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0 overflow-y-auto max-h-[calc(100vh-7rem)] [&::-webkit-scrollbar]:hidden">
            <div className="overflow-hidden rounded-2xl bg-black shadow-sm">
              {playbackUrl ? (
                <VideoPlayer key={id} options={playerOptions} />
              ) : (
                <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-zinc-300">
                  This video is not ready for playback yet. Wait for transcoding to finish.
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                    {video.title}
                  </h1>
                  <span className="rounded-md bg-[var(--brand-soft)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--brand)]">
                    HD
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
                  <span>{formatViews(video.views)}</span>
                  {formatDate(video.created_at) && (
                    <>
                      <span>·</span>
                      <span>{formatDate(video.created_at)}</span>
                    </>
                  )}
                  {categoryLabel && (
                    <>
                      <span>·</span>
                      <button
                        type="button"
                        className="font-medium text-[var(--brand)] hover:underline"
                      >
                        #{categoryLabel.replace(/\s+/g, "")}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <LikeButton
                  videoId={video.id}
                  initialCount={video.like_count ?? 0}
                  initialLiked={Boolean(video.liked)}
                />
                {/* <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200"
                >
                  <Bookmark size={16} />
                  Save
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200"
                >
                  <Share2 size={16} />
                  Share
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200"
                >
                  <Scissors size={16} />
                  Clip
                </button>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  aria-label="More"
                >
                  <MoreHorizontal size={16} />
                </button> */}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-sm font-bold text-[var(--brand)]">
                    {channelInitial(channelName)}
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 font-semibold text-zinc-900">
                      <span className="truncate">{channelName}</span>
                      <SealCheck size={16} weight="fill" className="shrink-0 text-sky-500" />
                    </p>
                    <p className="text-xs text-zinc-500">Channel</p>
                  </div>
                </div>
                {canSubscribe && (
                  <SubscribeButton
                    userId={video.user_id}
                    initialSubscribed={Boolean(video.subscribed)}
                  />
                )}
              </div>

              {(description || categoryLabel) && (
                <div className="mt-4 border-t border-zinc-100 pt-4 text-sm text-zinc-600">
                  <p className={descExpanded || !showMore ? "" : "line-clamp-2"}>
                    {description || `Watch more from ${channelName} in ${categoryLabel}.`}
                  </p>
                  {showMore && (
                    <button
                      type="button"
                      onClick={() => setDescExpanded((prev) => !prev)}
                      className="mt-1 font-semibold text-[var(--brand)] hover:underline"
                    >
                      {descExpanded ? "Show less" : "...more"}
                    </button>
                  )}
                </div>
              )}
            </div>

            <CommentsSection videoId={video.id} />
          </div>

          <WatchSidebar excludeVideoId={video.id} />
        </div>
      )}
    </MainLayout>
  );
}
