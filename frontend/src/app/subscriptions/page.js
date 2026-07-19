"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Settings } from "lucide-react";
import MainLayout from "@/components/layout/mainLayout";
import ChannelCard from "@/components/ui/channelcard";
import VideoCard from "@/components/video/videocard";
import AuthGate from "@/components/auth/authgate";
import { getSubscriptions, getVideos, getThumbnailUrl } from "@/lib/video";

const FALLBACK_THUMBNAIL =
  "https://placehold.co/640x360/e2e8f0/64748b?text=Video";

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
  return {
    id: video.id,
    title: video.title,
    thumbnail: getThumbnailUrl(video.thumbnail_url) ?? FALLBACK_THUMBNAIL,
    creator: video.uploaded_by ?? "Unknown",
    views: video.views ?? 0,
    duration: video.duration_seconds,
    likeCount: video.like_count ?? 0,
    createdAtLabel: formatRelativeTime(video.created_at),
  };
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
  const [subscribedChannels, setSubscribedChannels] = useState([]);
  const [recentVideos, setRecentVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const channelsData = await getSubscriptions();
        const channels = Array.isArray(channelsData)
          ? channelsData
          : channelsData.items ?? [];
        if (cancelled) return;

        setSubscribedChannels(channels.map(toChannelProps));

        const channelIds = new Set(channels.map((c) => String(c.id)));
        if (channelIds.size === 0) {
          setRecentVideos([]);
          return;
        }

        const videosData = await getVideos({ limit: 24 });
        if (cancelled) return;

        const items = (videosData.items ?? [])
          .filter((video) => channelIds.has(String(video.user_id)))
          .slice(0, 10)
          .map(toVideoProps);

        setRecentVideos(items);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError(err.message || "Failed to load subscriptions.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

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

        {loading && <p className="text-sm text-zinc-500">Loading channels...</p>}
        {error && <p className="text-sm text-[var(--brand)]">{error}</p>}

        {!loading && !error && subscribedChannels.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500">
            You haven&apos;t subscribed to any channels yet.
          </p>
        )}

        {!loading && subscribedChannels.length > 0 && (
          <HorizontalScroller>
            {subscribedChannels.map((channel) => (
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

        {!loading && recentVideos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500">
            No recent videos from your subscriptions.
          </p>
        ) : (
          <HorizontalScroller>
            {recentVideos.map((video) => (
              <div
                key={video.id}
                className="w-[calc((100%-4rem)/5)] min-w-[275px] shrink-0"
              >
                <VideoCard {...video} />
              </div>
            ))}
          </HorizontalScroller>
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
