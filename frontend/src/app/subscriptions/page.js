"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import MainLayout from "@/components/layout/mainLayout";
import ChannelCard from "@/components/ui/channelcard";
import VideoGrid from "@/components/home/videogrid";
import AuthGate from "@/components/auth/authgate";
import { toVideoCardProps } from "@/lib/video";
import {
  rtkErrorMessage,
  useGetSubscriptionsQuery,
  useGetVideosQuery,
} from "@/lib/redux/api";

function toChannelProps(channel, index) {
  return {
    id: channel.id,
    username: channel.username,
    fullName: channel.full_name,
    profileImageUrl: channel.profile_image_url,
    accentIndex: index,
  };
}

function formatRelativeTime(dateString) {
  if (!dateString) return null;
  const then = new Date(dateString).getTime();
  if (Number.isNaN(then)) return null;

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    return `${m} ${m === 1 ? "minute" : "minutes"} ago`;
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  }
  if (seconds < 604800) {
    const d = Math.floor(seconds / 86400);
    return `${d} ${d === 1 ? "day" : "days"} ago`;
  }
  const w = Math.floor(seconds / 604800);
  return `${w} ${w === 1 ? "week" : "weeks"} ago`;
}

function toVideoProps(video) {
  return toVideoCardProps(video, {
    createdAtLabel: formatRelativeTime(video.created_at),
  });
}

function HorizontalScroller({ children, empty }) {
  const scrollerRef = useRef(null);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;

    const update = () => {
      setCanScroll(node.scrollWidth > node.clientWidth + 8);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [children]);

  const scrollNext = () => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollBy({ left: Math.max(240, node.clientWidth * 0.7), behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
        {empty}
      </div>
      {canScroll && (
        <button
          type="button"
          onClick={scrollNext}
          className="absolute top-1/2 right-0 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-md transition hover:bg-zinc-50"
          aria-label="Scroll right"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}

function SubscriptionsContent() {
  const { data, isLoading, error } = useGetSubscriptionsQuery();
  const channels = (Array.isArray(data) ? data : data?.items ?? []).map(toChannelProps);
  const channelIds = new Set(channels.map((channel) => String(channel.id)));

  const { data: videosData, isLoading: videosLoading } = useGetVideosQuery(
    { limit: 24 },
    { skip: channels.length === 0 }
  );
  const videoItems = Array.isArray(videosData)
    ? videosData
    : videosData?.items ?? [];
  const recentVideos = videoItems
    .filter((video) => channelIds.has(String(video.user_id)))
    .slice(0, 10)
    .map(toVideoProps);

  return (
    <MainLayout>
      <section className="mb-10">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Subscribed Channels
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Channels you follow and get updates from
            </p>
          </div>
        </div>

        {isLoading && <p className="text-sm text-zinc-500">Loading channels...</p>}
        {error && (
          <p className="text-sm text-[var(--brand)]">{rtkErrorMessage(error)}</p>
        )}

        {!isLoading && !error && channels.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500">
            You haven&apos;t subscribed to any channels yet.
          </p>
        )}

        {!isLoading && channels.length > 0 && (
          <HorizontalScroller>
            {channels.map((channel) => (
              <ChannelCard key={channel.id ?? channel.username} {...channel} />
            ))}
          </HorizontalScroller>
        )}
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-zinc-900 sm:text-xl">
            Recent Videos from Subscriptions
          </h2>
        </div>

        {videosLoading && (
          <p className="text-sm text-zinc-500">Loading recent videos...</p>
        )}

        {!isLoading && !videosLoading && recentVideos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500">
            No recent videos from your subscriptions.
          </p>
        ) : (
          <VideoGrid videos={recentVideos} />
        )}
      </section>
    </MainLayout>
  );
}

export default function SubscriptionsPage() {
  return (
    <AuthGate feature="subscriptions">
      <SubscriptionsContent />
    </AuthGate>
  );
}
