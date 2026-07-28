"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import MainLayout from "@/components/layout/mainLayout";
import VideoCard from "@/components/video/videocard";
import AuthGate from "@/components/auth/authgate";
import { ClockCounterClockwise } from "@phosphor-icons/react";
import { deleteWatchHistory, getWatchHistory, getThumbnailUrl } from "@/lib/video";

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

function WatchHistoryContent() {
  const [watchHistory, setWatchHistory] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    getWatchHistory()
      .then((videos) => {
        const list = Array.isArray(videos) ? videos : (videos.items ?? []);
        setWatchHistory(list.map(toCardProps));
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  async function handleClearHistory() {
    setClearing(true);
    try {
      await deleteWatchHistory();
      setWatchHistory([]);
      setConfirmOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setClearing(false);
    }
  }

  return (
    <MainLayout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ClockCounterClockwise size={24} className="rounded-full text-[var(--brand)]" />
          <h2 className="text-2xl font-bold">Watch History</h2>
        </div>
        {watchHistory.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <Trash2 size={16} />
            Clear all
          </button>
        )}
      </div>

      {watchHistory.length === 0 ? (
        <p className="text-sm text-zinc-500">No videos in your watch history yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {watchHistory.map((video) => (
            <VideoCard key={video.id} {...video} />
          ))}
        </div>
      )}

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]"
          onClick={() => {
            if (!clearing) setConfirmOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-history-title"
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Trash2 size={28} />
            </div>
            <h2
              id="clear-history-title"
              className="mt-4 text-center text-lg font-semibold text-zinc-900"
            >
              Clear watch history?
            </h2>
            <p className="mt-2 text-center text-sm text-zinc-500">
              All videos will be removed from your watch history. This can’t be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={clearing}
                className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                disabled={clearing}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {clearing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                {clearing ? "Clearing..." : "Clear all"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default function WatchHistoryPage() {
  return (
    <AuthGate feature="watch-history">
      <WatchHistoryContent />
    </AuthGate>
  );
}
