"use client";

import { useState } from "react";
import MainLayout from "@/components/layout/mainLayout";
import VideoGrid from "@/components/home/videogrid";
import AuthGate from "@/components/auth/authgate";
import { Heart } from "@phosphor-icons/react";
import { toVideoCardProps } from "@/lib/video";
import { rtkErrorMessage, useGetLikedVideosQuery } from "@/lib/redux/api";

const PAGE_SIZE = 20;

function LikedVideosContent() {
  const [cursor, setCursor] = useState(undefined);
  const { data, isLoading, isFetching, error } = useGetLikedVideosQuery({
    limit: PAGE_SIZE,
    cursor,
  });

  const videos = (data?.items ?? []).map((video) => toVideoCardProps(video));
  const hasMore = Boolean(data?.has_more);
  const nextCursor = data?.next_cursor ?? null;
  const loadingMore = Boolean(cursor) && isFetching;

  function handleNearEnd() {
    if (!hasMore || !nextCursor || loadingMore) return;
    setCursor(nextCursor);
  }

  return (
    <MainLayout>
      <div className="mb-6 flex items-center gap-2">
        <Heart size={24} weight="fill" className="rounded-full text-[var(--brand)]" />
        <h2 className="text-2xl font-bold">Liked Videos</h2>
      </div>
      {isLoading && <p className="text-sm text-zinc-500">Loading liked videos...</p>}
      {error && !videos.length && (
        <p className="text-sm text-[var(--brand)]">{rtkErrorMessage(error)}</p>
      )}
      {!isLoading && !error && videos.length === 0 && (
        <p className="text-sm text-zinc-500">No liked videos yet.</p>
      )}
      <VideoGrid
        videos={videos}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onNearEnd={handleNearEnd}
      />
    </MainLayout>
  );
}

export default function LikedVideosPage() {
  return (
    <AuthGate feature="likedvideos">
      <LikedVideosContent />
    </AuthGate>
  );
}
