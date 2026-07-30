"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import MainLayout from "@/components/layout/mainLayout";
import VideoCard from "@/components/video/videocard";
import AuthGate from "@/components/auth/authgate";
import { Heart } from "@phosphor-icons/react";
import { getLikedVideos, getThumbnailUrl } from "@/lib/video";

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
    likeCount: video.like_count ?? 0,
  };
}

function LikedVideosContent() {
  const [likedVideos, setLikedVideos] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadLiked = useCallback(async (cursor) => {
    const data = await getLikedVideos({ limit: PAGE_SIZE, cursor });
    const list = Array.isArray(data) ? data : (data.items ?? []);
    const mapped = list.map(toCardProps);
    setLikedVideos((prev) => (cursor ? [...prev, ...mapped] : mapped));
    setNextCursor(data.next_cursor ?? null);
    setHasMore(Boolean(data.has_more));
  }, []);

  useEffect(() => {
    loadLiked().catch((err) => console.error(err));
  }, [loadLiked]);

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      await loadLiked(nextCursor);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <MainLayout>
      <div className="mb-6 flex items-center gap-2">
        <Heart size={24} weight="fill" className="rounded-full text-[var(--brand)]" />
        <h2 className="text-2xl font-bold">Liked Videos</h2>
      </div>
      {likedVideos.length === 0 ? (
        <p className="text-sm text-zinc-500">No liked videos yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {likedVideos.map((video) => (
              <VideoCard key={video.id} {...video} />
            ))}
          </div>
          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="mt-6 w-full rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
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
      )}
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
