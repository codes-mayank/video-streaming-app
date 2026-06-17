"use client";

import { useEffect, useState } from "react";
import VideoCard from "../video/videocard";
import { getVideos } from "@/lib/video";

function toCardProps(video) {
  return {
    id: video.id,
    title: video.title,
    thumbnail:
      video.thumbnail ??
      "https://placehold.co/640x360/e2e8f0/64748b?text=Video",
    creator: video.uploaded_by ?? "Unknown",
    views: video.views ?? 0,
  };
}

export default function VideoGrid({ query }) {
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVideos()
      .then((data) => {
        console.log(data);
        setVideos((data.items ?? []).map(toCardProps));
      })
      .catch((err) => {
        console.error("getVideos failed:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-gray-500">Loading videos...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!videos.length) {
    return <p className="text-gray-500">No videos yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {videos.map((video) => (
        <VideoCard key={video.id} {...video} />
      ))}
    </div>
  );
}
