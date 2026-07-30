"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import VideoCard from "../video/videocard";
import { getVideos, getChannelVideos, getThumbnailUrl } from "@/lib/video";

const PAGE_SIZE = 15;
const ROW_ESTIMATE_PX = 300;
const FALLBACK_THUMBNAIL =
  "https://placehold.co/640x360/e2e8f0/64748b?text=Video";

function toCardProps(video) {
  return {
    id: video.id,
    title: video.title,
    thumbnail: getThumbnailUrl(video.thumbnail_url) ?? FALLBACK_THUMBNAIL,
    creator: video.uploaded_by ?? "Unknown",
    views: video.views ?? 0,
    duration: video.duration_seconds,
    likeCount: video.like_count ?? 0,
  };
}

function getColumnCount(width) {
  if (width >= 1024) return 4; // lg
  if (width >= 768) return 3; // md
  if (width >= 640) return 2; // sm
  return 1;
}

function findScrollParent(node) {
  let el = node?.parentElement ?? null;
  while (el) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY === "auto" || overflowY === "scroll") return el;
    el = el.parentElement;
  }
  return null;
}

export default function VideoGrid({ category, userId }) {
  const [videos, setVideos] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [columnCount, setColumnCount] = useState(4);
  const [scrollElement, setScrollElement] = useState(null);

  const gridRef = useRef(null);
  const loadingMoreRef = useRef(false);

  const rowCount = Math.ceil(videos.length / columnCount) || 0;

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollElement,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: 2,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  const loadVideos = useCallback(
    async (cursor) => {
      const data = userId
        ? await getChannelVideos(userId, { limit: PAGE_SIZE, cursor })
        : await getVideos({ category, limit: PAGE_SIZE, cursor });
      const items = (data.items ?? []).map(toCardProps);
      setVideos((prev) => (cursor ? [...prev, ...items] : items));
      setNextCursor(data.next_cursor ?? null);
      setHasMore(Boolean(data.has_more));
    },
    [category, userId]
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

  // Resolve the real scroll container (MainLayout <main>) and track column breakpoints.
  useEffect(() => {
    const node = gridRef.current;
    if (!node) return;

    const scrollParent = findScrollParent(node);
    setScrollElement(scrollParent);

    function updateColumns() {
      setColumnCount(getColumnCount(node.clientWidth || window.innerWidth));
    }
    updateColumns();

    const resizeObserver = new ResizeObserver(updateColumns);
    resizeObserver.observe(node);
    return () => resizeObserver.disconnect();
  }, [loading, videos.length]);

  // Prefetch next page when the virtual window nears the end of loaded rows.
  useEffect(() => {
    if (!hasMore || !nextCursor || loadingMoreRef.current || !virtualRows.length) {
      return;
    }

    const lastItem = virtualRows[virtualRows.length - 1];
    if (!lastItem) return;

    const nearEnd = lastItem.index >= rowCount - 3;
    if (!nearEnd) return;

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
  }, [virtualRows, rowCount, hasMore, nextCursor, loadVideos]);

  const totalSize = rowVirtualizer.getTotalSize();

  const rows = useMemo(() => {
    return virtualRows.map((virtualRow) => {
      const startIndex = virtualRow.index * columnCount;
      return {
        virtualRow,
        items: videos.slice(startIndex, startIndex + columnCount),
      };
    });
  }, [virtualRows, columnCount, videos]);

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
    <div ref={gridRef}>
      <div
        className="relative w-full"
        style={{ height: `${totalSize}px` }}
      >
        {rows.map(({ virtualRow, items }) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={rowVirtualizer.measureElement}
            className="absolute top-0 left-0 grid w-full grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            style={{
              transform: `translateY(${virtualRow.start}px)`,
              paddingBottom: "2rem",
            }}
          >
            {items.map((video) => (
              <VideoCard key={video.id} {...video} />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-2 flex h-8 items-center justify-center">
        {loadingMore && <p className="text-sm text-zinc-500">Loading more...</p>}
        {!hasMore && videos.length > 0 && (
          <p className="text-sm text-zinc-400">No more videos</p>
        )}
      </div>
    </div>
  );
}
