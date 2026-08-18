"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MainLayout from "@/components/layout/mainLayout";
import VideoGrid from "@/components/home/videogrid";
import { toVideoCardProps } from "@/lib/video";
import { Loader2 } from "lucide-react";
import { rtkErrorMessage, useSearchVideosQuery } from "@/lib/redux/api";

const PAGE_SIZE = 20;

function SearchResults() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("query") ?? "").trim();
  const [cursor, setCursor] = useState(undefined);
  const { data, isLoading, isFetching, error } = useSearchVideosQuery(
    { query, limit: PAGE_SIZE, cursor },
    { skip: !query }
  );

  useEffect(() => {
    setCursor(undefined);
  }, [query]);

  const videos = (data?.items ?? []).map((video) => toVideoCardProps(video));
  const hasMore = Boolean(data?.has_more);
  const nextCursor = data?.next_cursor ?? null;
  const loadingMore = Boolean(cursor) && isFetching;

  function handleNearEnd() {
    if (!hasMore || !nextCursor || loadingMore) return;
    setCursor(nextCursor);
  }

  if (!query) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        Enter a search query to find videos
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        {rtkErrorMessage(error)}
      </div>
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
