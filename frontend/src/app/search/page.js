"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MainLayout from "@/components/layout/mainLayout";
import VideoCard from "@/components/video/videocard";
import { searchVideos, getThumbnailUrl } from "@/lib/video";
import { Loader2 } from "lucide-react";

const PAGE_SIZE = 20;
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
  };
}

function SearchResults() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("query") ?? "").trim();
  const [videos, setVideos] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const loadResults = useCallback(
    async (cursor) => {
      const data = await searchVideos(query, { limit: PAGE_SIZE, cursor });
      const list = Array.isArray(data) ? data : (data.items ?? []);
      const mapped = list.map(toCardProps);
      setVideos((prev) => (cursor ? [...prev, ...mapped] : mapped));
      setNextCursor(data.next_cursor ?? null);
      setHasMore(Boolean(data.has_more));
    },
    [query]
  );

  useEffect(() => {
    if (!query) {
      setVideos([]);
      setNextCursor(null);
      setHasMore(false);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setVideos([]);
    setNextCursor(null);
    setHasMore(false);

    loadResults()
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query, loadResults]);

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      await loadResults(nextCursor);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-500" />
      </div>
    );
  }

  if (!query) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        Enter a search query to find videos
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center">{error}</div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        No results found for &quot;{query}&quot;
      </div>
    );
  }

  return (
    <>
      <h2 className="mb-6 text-2xl font-bold">Search Results for &quot;{query}&quot;</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {videos.map((video) => (
          <VideoCard key={video.id} {...video} />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="mt-6 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--card-hover)] disabled:opacity-60"
        >
          {loadingMore ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Loading...
            </span>
          ) : (
            "Load more"
          )}
        </button>
      )}
    </>
  );
}

export default function SearchPage() {
  return (
    <MainLayout>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">Loading...</div>
        }
      >
        <SearchResults />
      </Suspense>
    </MainLayout>
  );
}
