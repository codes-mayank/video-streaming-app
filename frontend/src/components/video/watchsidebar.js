"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import VideoCard from "@/components/video/videocard";
import { getCurrentUser } from "@/lib/auth";
import { getWatchHistory, getThumbnailUrl } from "@/lib/video";

const FALLBACK_THUMBNAIL =
  "https://placehold.co/640x360/e2e8f0/64748b?text=Video";

function toCardProps(video) {
  const progress = ((Number(video.id) * 37) % 70) + 20;
  return {
    id: video.id,
    title: video.title,
    thumbnail: getThumbnailUrl(video.thumbnail_url) ?? FALLBACK_THUMBNAIL,
    creator: video.uploaded_by ?? "Unknown",
    views: video.views ?? 0,
    duration: video.duration_seconds,
    likeCount: video.like_count ?? 0,
    progress,
  };
}

export default function WatchSidebar({ excludeVideoId }) {
  const [videos, setVideos] = useState([]);
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((user) => {
        if (!user || cancelled) return null;
        return getWatchHistory();
      })
      .then((data) => {
        if (cancelled || !data) return;
        const list = Array.isArray(data) ? data : data.items ?? [];
        setVideos(
          list
            .filter((video) => String(video.id) !== String(excludeVideoId))
            .slice(0, 4)
            .map(toCardProps)
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [excludeVideoId]);

  return (
    <aside className="space-y-8 overflow-y-auto max-h-[calc(100vh-7rem)] [&::-webkit-scrollbar]:hidden">
      {/* <section> */}
        {/* <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-zinc-900">Up Next</h2>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-500">
            Autoplay
            <button
              type="button"
              role="switch"
              aria-checked={autoplay}
              onClick={() => setAutoplay((prev) => !prev)}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                autoplay ? "bg-[var(--brand)]" : "bg-zinc-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  autoplay ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </label>
        </div> */}
        {/* Up Next list intentionally empty */}
      {/* </section> */}

      {videos.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-zinc-900">Continue Watching</h2>
            <Link
              href="/watch-history"
              className="text-sm font-medium text-[var(--brand)] hover:text-[var(--brand-hover)]"
            >
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {videos.map((video) => (
              <VideoCard key={video.id} {...video} />
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
