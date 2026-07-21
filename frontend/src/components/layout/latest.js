"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMostLikedVideos, getThumbnailUrl } from "@/lib/video";
import LatestVideoCard from "../video/latestvideocard";
import { getCategoryLabel } from "@/lib/categories";

const FALLBACK_THUMBNAIL =
  "https://placehold.co/1280x548/e2e8f0/64748b?text=Video";

const AUTO_SLIDE_MS = 3000;

function toCardProps(video) {
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    thumbnail: getThumbnailUrl(video.thumbnail_url) ?? FALLBACK_THUMBNAIL,
    views: video.views ?? 0,
    likeCount: video.like_count ?? 0,
    category: getCategoryLabel(video.category),
    createdAt: video.created_at,
  };
}

export default function Latest() {
  const [videos, setVideos] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMostLikedVideos(5)
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items ?? [];
        setVideos(list.map(toCardProps));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (videos.length < 2) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % videos.length);
    }, AUTO_SLIDE_MS);
    return () => clearInterval(interval);
  }, [videos.length, current]);

  if (loading) {
    return (
      <div className="mb-8 h-[230px] animate-pulse rounded-3xl bg-zinc-200 sm:h-[200px] lg:h-[220px]" />
    );
  }

  if (error) {
    return <p className="mb-6 text-[var(--brand)]">{error}</p>;
  }

  if (videos.length === 0) {
    return null;
  }

  const showControls = videos.length > 1;
  const goPrev = () => setCurrent((prev) => (prev - 1 + videos.length) % videos.length);
  const goNext = () => setCurrent((prev) => (prev + 1) % videos.length);

  return (
    <section className="relative mb-8">
      <div className="overflow-hidden rounded-3xl shadow-xl">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {videos.map((video) => (
            <div key={video.id} className="w-full shrink-0">
              <LatestVideoCard {...video} />
            </div>
          ))}
        </div>
      </div>

      {showControls && (
        <>
          <div className="absolute right-4 top-4 z-10 flex gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
              aria-label="Previous video"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
              aria-label="Next video"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="absolute bottom-3 left-1/2 z-10 bg-black/50 p-2 rounded-full flex -translate-x-1/2 gap-1.5">
            {videos.map((video, index) => (
              <button
                key={video.id}
                type="button"
                onClick={() => setCurrent(index)}
                aria-label={`Go to video ${index + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  index === current
                    ? "w-5 bg-[var(--brand-light)]"
                    : "w-1.5 bg-white/80 hover:bg-white"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
