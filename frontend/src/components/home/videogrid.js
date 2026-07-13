"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import VideoCard from "../video/videocard";
import { getVideos, getThumbnailUrl } from "@/lib/video";

const PAGE_SIZE = 12; // 3 rows × 4 columns at lg
const FALLBACK_THUMBNAIL =
  "https://placehold.co/640x360/e2e8f0/64748b?text=Video";

function toCardProps(video) {
  return {
    id: video.id,
    title: video.title,
    thumbnail: getThumbnailUrl(video.thumbnail_url) ?? FALLBACK_THUMBNAIL,
    creator: video.uploaded_by ?? "Unknown",
    views: video.views ?? 0,
    likeCount: video.like_count ?? 0,
  };
}

export default function VideoGrid({ category }) {
  const [videos, setVideos] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);
  const loadingMoreRef = useRef(false);

  const loadVideos = useCallback(
    async (cursor) => {
      const data = await getVideos({ category, limit: PAGE_SIZE, cursor });
      const items = (data.items ?? []).map(toCardProps);
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

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || !nextCursor) return;

    let scrollRoot = node.parentElement;
    while (scrollRoot) {
      const { overflowY } = getComputedStyle(scrollRoot);
      if (overflowY === "auto" || overflowY === "scroll") break;
      scrollRoot = scrollRoot.parentElement;
    }
    if (!scrollRoot) return;

    function onScroll() {
      if (loadingMoreRef.current) return;

      const distanceFromBottom =
        scrollRoot.scrollHeight - scrollRoot.scrollTop - scrollRoot.clientHeight;
      // Only load once the user has scrolled to the very end of the page
      if (distanceFromBottom > 2) return;

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
    }

    scrollRoot.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollRoot.removeEventListener("scroll", onScroll);
  }, [hasMore, nextCursor, loadVideos]);

  if (loading) {
    return <p className="text-gray-500">Loading videos...</p>;
  }

  if (error && !videos.length) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!videos.length) {
    return <p className="text-gray-500">No videos yet.</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {videos.map((video) => (
          <VideoCard key={video.id} {...video} />
        ))}
      </div>
      <div ref={sentinelRef} className="h-8 flex items-center justify-center mt-6">
        {loadingMore && <p className="text-gray-500 text-sm">Loading more...</p>}
        {!hasMore && videos.length > 0 && (
          <p className="text-gray-400 text-sm">No more videos</p>
        )}
      </div>
    </div>
  );
}
