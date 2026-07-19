"use client";

import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/mainLayout";
import VideoCard from "@/components/video/videocard";
import AuthGate from "@/components/auth/authgate";
import { ClockCounterClockwise } from "@phosphor-icons/react";
import { getWatchHistory, getThumbnailUrl } from "@/lib/video";

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

  return (
    <MainLayout>
      <div className="flex items-center gap-2 mb-6">
      <ClockCounterClockwise size={24} className="text-[var(--brand)] rounded-full" />
      <h2 className="text-2xl font-bold">Watch History</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {watchHistory.map((video) => (
          <VideoCard key={video.id} {...video} />
        ))}
      </div>
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
