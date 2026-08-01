"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import VideoCard from "../video/videocard";

// Must match Tailwind: sm 640 / md 768 / lg 1024 (viewport, not container width)
const ROW_ESTIMATE_PX = 300;

function getColumnCountFromViewport() {
  if (typeof window === "undefined") return 2;
  if (window.matchMedia("(min-width: 1024px)").matches) return 4;
  if (window.matchMedia("(min-width: 768px)").matches) return 3;
  if (window.matchMedia("(min-width: 640px)").matches) return 2;
  return 1;
}

export default function VideoGrid({
  videos = [],
  hasMore = false,
  loadingMore = false,
  onNearEnd,
}) {
  const [columnCount, setColumnCount] = useState(2);
  const [scrollElement, setScrollElement] = useState(null);
  const gridRef = useRef(null);
  const nearEndLockRef = useRef(false);

  const rowCount = Math.ceil(videos.length / columnCount) || 0;

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollElement,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: 6,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    setScrollElement(document.getElementById("scroll-container"));

    const mqLg = window.matchMedia("(min-width: 1024px)");
    const mqMd = window.matchMedia("(min-width: 768px)");
    const mqSm = window.matchMedia("(min-width: 640px)");

    function updateColumns() {
      setColumnCount(getColumnCountFromViewport());
    }

    updateColumns();
    mqLg.addEventListener("change", updateColumns);
    mqMd.addEventListener("change", updateColumns);
    mqSm.addEventListener("change", updateColumns);
    return () => {
      mqLg.removeEventListener("change", updateColumns);
      mqMd.removeEventListener("change", updateColumns);
      mqSm.removeEventListener("change", updateColumns);
    };
  }, []);

  useEffect(() => {
    if (!hasMore || !onNearEnd || loadingMore || nearEndLockRef.current || !virtualRows.length) {
      return;
    }

    const lastItem = virtualRows[virtualRows.length - 1];
    if (!lastItem || lastItem.index < rowCount - 3) return;

    nearEndLockRef.current = true;
    onNearEnd();
  }, [virtualRows, rowCount, hasMore, loadingMore, onNearEnd]);

  useEffect(() => {
    if (!loadingMore) nearEndLockRef.current = false;
  }, [loadingMore]);

  const rows = useMemo(
    () =>
      virtualRows.map((virtualRow) => ({
        virtualRow,
        items: videos.slice(
          virtualRow.index * columnCount,
          virtualRow.index * columnCount + columnCount
        ),
      })),
    [virtualRows, columnCount, videos]
  );

  if (!videos.length) {
    return null;
  }

  return (
    <div ref={gridRef}>
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rows.map(({ virtualRow, items }) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
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
        {onNearEnd && !hasMore && !loadingMore && (
          <p className="text-sm text-zinc-400">No more videos</p>
        )}
      </div>
    </div>
  );
}
