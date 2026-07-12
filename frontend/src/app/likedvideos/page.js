"use client";

import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/mainLayout";
import VideoCard from "@/components/video/videocard";
import { getLikedVideos, getThumbnailUrl } from "@/lib/video";

const FALLBACK_THUMBNAIL =
  "https://placehold.co/640x360/e2e8f0/64748b?text=Video";

function toCardProps(video) {
    return {
      id: video.id,
      title: video.title,
      thumbnail: getThumbnailUrl(video.thumbnail_url) ?? FALLBACK_THUMBNAIL,
      creator: video.uploaded_by ?? "Unknown",
      views: video.views ?? 0,
      likeCount: video.like_count ?? 0,
    };
  }

export default function WatchHistoryPage() {
    const [likedvideos, setLikedVideos] = useState([]);
    useEffect(() => {
        getLikedVideos()
        .then((videos) => {
            const list = Array.isArray(videos) ? videos : (videos.items ?? []);
            setLikedVideos(list.map(toCardProps));
        })
        .catch((err) => {
            console.error(err);
        });
    }, []);
    return (
        <MainLayout>
            <h2 className="text-2xl font-bold mb-6">Liked Videos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {likedvideos.map((video) => (
                    <VideoCard key={video.id} {...video} />
                ))}
            </div>
        </MainLayout>
    );
}