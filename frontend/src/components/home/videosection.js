"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, History } from "lucide-react";
import { Video } from "@phosphor-icons/react";
import VideoGrid from "./videogrid";
import { getVideos, toVideoCardProps } from "@/lib/video";

const PAGE_SIZE = 15;

const SECTION_ICONS = {
  Videos: Video,
  "Continue Watching": History,
};

export default function VideoSection({ title, category, href = "/" }) {
  const Icon = SECTION_ICONS[title] ?? Flame;
  const [videos, setVideos] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const loadingMoreRef = useRef(false);

  const loadVideos = useCallback(
    async (cursor) => {
      const data = await getVideos({ category, limit: PAGE_SIZE, cursor });
      const items = (data.items ?? []).map((video) => toVideoCardProps(video));
      setVideos((prev) => (cursor ? [...prev, ...items] : items));
      setNextCursor(data.next_cursor ?? null);
      setHasMore(Boolean(data.has_more));
    },
    [category]
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      setVideos([]);
      setNextCursor(null);
      setHasMore(false);
      try {
        await loadVideos();
      } catch (err) {
        if (!cancelled) {
          console.error("getVideos failed:", err);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [loadVideos]);

  const handleNearEnd = useCallback(() => {
    if (!hasMore || !nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    loadVideos(nextCursor)
      .catch((err) => {
        console.error("getVideos failed:", err);
        setError(err.message);
      })
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [hasMore, nextCursor, loadVideos]);

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

      {loading && <p className="text-gray-500">Loading videos...</p>}
      {error && !videos.length && <p className="text-red-500">{error}</p>}
      {!loading && !error && !videos.length && (
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
