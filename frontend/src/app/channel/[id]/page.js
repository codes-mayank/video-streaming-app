"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import { SealCheck, Video } from "@phosphor-icons/react";

import MainLayout from "@/components/layout/mainLayout";
import VideoGrid from "@/components/home/videogrid";
import SubscribeButton from "@/components/video/subscribebutton";
import { getChannel, getChannelVideos, toVideoCardProps } from "@/lib/video";
import { decodeChannelId } from "@/lib/videoId";
import { useGetCurrentUserQuery } from "@/lib/redux/api";

const PAGE_SIZE = 15;

export default function ChannelPage() {
  const { id } = useParams();
  const [channel, setChannel] = useState(null);
  const { data: user } = useGetCurrentUserQuery();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [videosLoading, setVideosLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [videosError, setVideosError] = useState(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const channelId = decodeChannelId(id);
      if (!channelId) {
        setError("Channel not found");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const channelData = await getChannel(channelId);
        if (cancelled) return;
        setChannel(channelData);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load channel.");
          setChannel(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadVideos = useCallback(
    async (cursor) => {
      if (!channel?.id) return;
      const data = await getChannelVideos(channel.id, {
        limit: PAGE_SIZE,
        cursor,
      });
      const items = (data.items ?? []).map((video) => toVideoCardProps(video));
      setVideos((prev) => (cursor ? [...prev, ...items] : items));
      setNextCursor(data.next_cursor ?? null);
      setHasMore(Boolean(data.has_more));
    },
    [channel?.id]
  );

  useEffect(() => {
    if (!channel?.id) return;
    let cancelled = false;

    async function initVideos() {
      setVideosLoading(true);
      setVideosError(null);
      setVideos([]);
      setNextCursor(null);
      setHasMore(false);
      try {
        await loadVideos();
      } catch (err) {
        if (!cancelled) setVideosError(err.message || "Failed to load videos.");
      } finally {
        if (!cancelled) setVideosLoading(false);
      }
    }

    initVideos();
    return () => {
      cancelled = true;
    };
  }, [channel?.id, loadVideos]);

  const handleNearEnd = useCallback(() => {
    if (!hasMore || !nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    loadVideos(nextCursor)
      .catch((err) => setVideosError(err.message))
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [hasMore, nextCursor, loadVideos]);

  const displayName = channel?.full_name || channel?.username || "Channel";
  const canSubscribe =
    channel?.id && String(user?.id ?? user?.user_id) !== String(channel.id);

  return (
    <MainLayout>
      <Link
        href="/subscriptions"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-[var(--brand)]"
      >
        <ArrowLeft size={16} />
        Back to Subscriptions
      </Link>

      {loading && <p className="text-sm text-zinc-500">Loading channel...</p>}
      {error && <p className="text-sm text-[var(--brand)]">{error}</p>}

      {channel && (
        <>
          <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--brand-soft)] text-[var(--brand)] sm:h-20 sm:w-20">
                {channel.profile_image_url ? (
                  <img
                    src={channel.profile_image_url}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User size={36} />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="flex items-center gap-1.5 text-2xl font-bold tracking-tight text-zinc-900">
                  <span className="truncate">{channel.username}</span>
                  <SealCheck size={20} weight="fill" className="shrink-0 text-sky-500" />
                </h1>
                {channel.full_name && channel.full_name !== channel.username && (
                  <p className="mt-0.5 truncate text-sm text-zinc-500">
                    {channel.full_name}
                  </p>
                )}
                <p className="mt-1 text-sm text-zinc-400">Channel videos</p>
              </div>
            </div>
            {canSubscribe && <SubscribeButton userId={channel.id} />}
          </div>

          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-zinc-900">
            <Video size={27} className="text-[var(--brand)]" weight="fill" /> Videos
          </h2>

          {videosLoading && <p className="text-sm text-zinc-500">Loading videos...</p>}
          {videosError && !videos.length && (
            <p className="text-sm text-[var(--brand)]">{videosError}</p>
          )}
          {!videosLoading && !videosError && !videos.length && (
            <p className="text-sm text-zinc-500">No videos yet.</p>
          )}

          <VideoGrid
            videos={videos}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onNearEnd={handleNearEnd}
          />
        </>
      )}
    </MainLayout>
  );
}
