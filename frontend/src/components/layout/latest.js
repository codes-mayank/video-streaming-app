"use client";

import { useEffect, useState } from "react";
import { getLatestVideo, getThumbnailUrl } from "@/lib/video";
import LatestVideoCard from "../video/latestvideocard";

import { getCategoryLabel } from "@/lib/categories";

const FALLBACK_THUMBNAIL =
  "https://placehold.co/1280x548/e2e8f0/64748b?text=Video";

function toCardProps(video) {
  return {
    id: video.id,
    title: video.title,
    thumbnail: getThumbnailUrl(video.thumbnail_url) ?? FALLBACK_THUMBNAIL,
    views: video.views ?? 0,
    category: getCategoryLabel(video.category),
    createdAt: video.created_at,
  };
}

export default function Latest() {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getLatestVideo()
      .then((data) => {
        const latest = Array.isArray(data) ? data[0] : data;
        setVideo(latest ? toCardProps(latest) : null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="mb-6 text-gray-500">Loading latest video…</p>;
  }

  if (error) {
    return <p className="mb-6 text-red-500">{error}</p>;
  }

  if (!video) {
    return null;
  }

  return (
    <section className="mb-8">
      <LatestVideoCard {...video} />
    </section>
  );
}
