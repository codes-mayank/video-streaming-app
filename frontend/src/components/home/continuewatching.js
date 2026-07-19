"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import VideoCard from "@/components/video/videocard";
import { getCurrentUser } from "@/lib/auth";
import { getWatchHistory, getThumbnailUrl } from "@/lib/video";

const FALLBACK_THUMBNAIL =
  "https://placehold.co/640x360/e2e8f0/64748b?text=Video";

function toCardProps(video) {
  // Placeholder progress until watch-position is tracked in the API
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

export default function ContinueWatching() {
  const [videos, setVideos] = useState([]);

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
        setVideos(list.slice(0, 4).map(toCardProps));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  if (!videos.length) return null;

  return (
    <section className="mb-10">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900 sm:text-xl">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
            <History size={16} />
          </span>
          Continue Watching
        </h2>
        <Link
          href="/watch-history"
          className="text-sm font-medium text-[var(--brand)] hover:text-[var(--brand-hover)]"
        >
          View all
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {videos.map((video) => (
          <VideoCard key={video.id} {...video} />
        ))}
      </div>
    </section>
  );
}
