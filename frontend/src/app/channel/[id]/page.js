"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, User } from "lucide-react";
import { SealCheck, Video } from "@phosphor-icons/react";

import MainLayout from "@/components/layout/mainLayout";
import VideoGrid from "@/components/home/videogrid";
import SubscribeButton from "@/components/video/subscribebutton";
import { toVideoCardProps } from "@/lib/video";
import { decodeChannelId } from "@/lib/videoId";
import {
  rtkErrorMessage,
  useGetChannelQuery,
  useGetChannelVideosQuery,
  useGetCurrentUserQuery,
} from "@/lib/redux/api";

const PAGE_SIZE = 15;

export default function ChannelPage() {
  const { id } = useParams();
  const channelId = decodeChannelId(id);
  const { data: user } = useGetCurrentUserQuery();
  const {
    data: channel,
    isLoading,
    error,
  } = useGetChannelQuery(channelId, { skip: !channelId });
  const [cursor, setCursor] = useState(undefined);
  const {
    data: videosData,
    isLoading: videosLoading,
    isFetching,
    error: videosError,
  } = useGetChannelVideosQuery(
    { userId: channelId, limit: PAGE_SIZE, cursor },
    { skip: !channelId }
  );

  useEffect(() => {
    setCursor(undefined);
  }, [channelId]);

  const videos = (videosData?.items ?? []).map((video) => toVideoCardProps(video));
  const hasMore = Boolean(videosData?.has_more);
  const nextCursor = videosData?.next_cursor ?? null;
  const loadingMore = Boolean(cursor) && isFetching;

  function handleNearEnd() {
    if (!hasMore || !nextCursor || loadingMore) return;
    setCursor(nextCursor);
  }

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

      {isLoading && <p className="text-sm text-zinc-500">Loading channel...</p>}
      {(error || !channelId) && (
        <p className="text-sm text-[var(--brand)]">
          {channelId ? rtkErrorMessage(error) : "Channel not found"}
        </p>
      )}

      {channel && (
        <>
          <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--brand-soft)] text-[var(--brand)] sm:h-20 sm:w-20">
                {channel.profile_image_url ? (
                  <Image
                    width={80}
                    height={80}
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
            <p className="text-sm text-[var(--brand)]">{rtkErrorMessage(videosError)}</p>
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
