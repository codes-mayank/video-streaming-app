"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MainLayout from "@/components/layout/mainLayout";
import VideoGrid from "@/components/home/videogrid";
import AuthGate from "@/components/auth/authgate";
import { Heart } from "@phosphor-icons/react";
import { getLikedVideos, toVideoCardProps } from "@/lib/video";

const PAGE_SIZE = 20;

function LikedVideosContent() {
  const [likedVideos, setLikedVideos] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const loadLiked = useCallback(async (cursor) => {
    const data = await getLikedVideos({ limit: PAGE_SIZE, cursor });
    const list = Array.isArray(data) ? data : (data.items ?? []);
    const mapped = list.map((video) => toVideoCardProps(video));
    setLikedVideos((prev) => (cursor ? [...prev, ...mapped] : mapped));
    setNextCursor(data.next_cursor ?? null);
    setHasMore(Boolean(data.has_more));
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadLiked()
      .catch((err) => console.error(err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadLiked]);

  const handleNearEnd = useCallback(() => {
    if (!hasMore || !nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    loadLiked(nextCursor)
      .catch((err) => console.error(err))
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [hasMore, nextCursor, loadLiked]);

  return (
    <MainLayout>
      <div className="mb-6 flex items-center gap-2">
        <Heart size={24} weight="fill" className="rounded-full text-[var(--brand)]" />
        <h2 className="text-2xl font-bold">Liked Videos</h2>
      </div>
      {loading && <p className="text-sm text-zinc-500">Loading liked videos...</p>}
      {!loading && likedVideos.length === 0 && (
        <p className="text-sm text-zinc-500">No liked videos yet.</p>
      )}
      <VideoGrid
        videos={likedVideos}
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
