"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import MainLayout from "@/components/layout/mainLayout";
import VideoGrid from "@/components/home/videogrid";
import { searchVideos, toVideoCardProps } from "@/lib/video";
import { Loader2 } from "lucide-react";

const PAGE_SIZE = 20;

function SearchResults() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("query") ?? "").trim();
  const [videos, setVideos] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const loadingMoreRef = useRef(false);

  const loadResults = useCallback(
    async (cursor) => {
      const data = await searchVideos(query, { limit: PAGE_SIZE, cursor });
      const list = Array.isArray(data) ? data : (data.items ?? []);
      const mapped = list.map((video) => toVideoCardProps(video));
      setVideos((prev) => (cursor ? [...prev, ...mapped] : mapped));
      setNextCursor(data.next_cursor ?? null);
      setHasMore(Boolean(data.has_more));
    },
    [query]
  );

  useEffect(() => {
    if (!query) return;

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

  const handleNearEnd = useCallback(() => {
    if (!hasMore || !nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    loadResults(nextCursor)
      .catch((err) => setError(err.message))
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [hasMore, nextCursor, loadResults]);

  if (!query) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        Enter a search query to find videos
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-500" />
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
      <h2 className="mb-6 text-2xl font-bold">
        Search Results for &quot;{query}&quot;
      </h2>
      <VideoGrid
        videos={videos}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onNearEnd={handleNearEnd}
      />
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
