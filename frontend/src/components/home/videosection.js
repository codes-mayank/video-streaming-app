"use client";

import { useEffect, useState } from "react";
import { Flame, History } from "lucide-react";
import { Video } from "@phosphor-icons/react";
import VideoGrid from "./videogrid";
import { toVideoCardProps } from "@/lib/video";
import { rtkErrorMessage, useGetVideosQuery } from "@/lib/redux/api";

const PAGE_SIZE = 15;

const SECTION_ICONS = {
  Videos: Video,
  "Continue Watching": History,
};

export default function VideoSection({ title, category }) {
  const Icon = SECTION_ICONS[title] ?? Flame;
  const [cursor, setCursor] = useState(undefined);
  const { data, isLoading, isFetching, error } = useGetVideosQuery({
    category,
    limit: PAGE_SIZE,
    cursor,
  });

  useEffect(() => {
    setCursor(undefined);
  }, [category]);

  const videos = (data?.items ?? []).map((video) => toVideoCardProps(video));
  const hasMore = Boolean(data?.has_more);
  const nextCursor = data?.next_cursor ?? null;
  const loadingMore = Boolean(cursor) && isFetching;

  function handleNearEnd() {
    if (!hasMore || !nextCursor || loadingMore) return;
    setCursor(nextCursor);
  }

  return (
    <section className="mb-10">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900 sm:text-xl">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
            <Icon size={27} weight="fill" />
          </span>
          {title}
        </h2>
      </div>

      {isLoading && <p className="text-gray-500">Loading videos...</p>}
      {error && !videos.length && (
        <p className="text-red-500">{rtkErrorMessage(error)}</p>
      )}
      {!isLoading && !error && !videos.length && (
        <p className="text-gray-500">No videos yet.</p>
      )}

      <VideoGrid
        videos={videos}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onNearEnd={handleNearEnd}
      />
    </section>
  );
}
