"use client";

import Link from "next/link";
import VideoCard from "@/components/video/videocard";
import { getThumbnailUrl } from "@/lib/video";
import { useGetCurrentUserQuery, useGetWatchHistoryQuery } from "@/lib/redux/api";

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
  const { data: user } = useGetCurrentUserQuery();
  const { data } = useGetWatchHistoryQuery({ limit: 8 }, { skip: !user });
  const videos = (Array.isArray(data) ? data : data?.items ?? [])
    .filter((video) => String(video.id) !== String(excludeVideoId))
    .slice(0, 4)
    .map(toCardProps);

  return (
    <aside className="space-y-8 overflow-y-auto max-h-[calc(100vh-7rem)] [&::-webkit-scrollbar]:hidden">
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
