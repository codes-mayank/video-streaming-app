"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import MainLayout from "@/components/layout/mainLayout";
import VideoGrid from "@/components/home/videogrid";
import AuthGate from "@/components/auth/authgate";
import { ClockCounterClockwise } from "@phosphor-icons/react";
import { deleteWatchHistory, getWatchHistory, toVideoCardProps } from "@/lib/video";

const PAGE_SIZE = 20;

function WatchHistoryContent() {
  const [watchHistory, setWatchHistory] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const loadingMoreRef = useRef(false);

  const loadHistory = useCallback(async (cursor) => {
    const data = await getWatchHistory({ limit: PAGE_SIZE, cursor });
    const list = Array.isArray(data) ? data : (data.items ?? []);
    const mapped = list.map((video) => toVideoCardProps(video));
    setWatchHistory((prev) => (cursor ? [...prev, ...mapped] : mapped));
    setNextCursor(data.next_cursor ?? null);
    setHasMore(Boolean(data.has_more));
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadHistory()
      .catch((err) => console.error(err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadHistory]);

  const handleNearEnd = useCallback(() => {
    if (!hasMore || !nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    loadHistory(nextCursor)
      .catch((err) => console.error(err))
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [hasMore, nextCursor, loadHistory]);

  async function handleClearHistory() {
    setClearing(true);
    try {
      await deleteWatchHistory();
      setWatchHistory([]);
      setNextCursor(null);
      setHasMore(false);
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
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <Trash2 size={16} />
            Clear all
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-zinc-500">Loading watch history...</p>}
      {!loading && watchHistory.length === 0 && (
        <p className="text-sm text-zinc-500">No videos in your watch history yet.</p>
      )}

      <VideoGrid
        videos={watchHistory}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onNearEnd={handleNearEnd}
      />

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
