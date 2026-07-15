"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MainLayout from "@/components/layout/mainLayout";
import VideoCard from "@/components/video/videocard";
import { searchVideos, getThumbnailUrl } from "@/lib/video";
import { Loader2 } from "lucide-react";

const FALLBACK_THUMBNAIL =
  "https://placehold.co/640x360/e2e8f0/64748b?text=Video";

function toCardProps(video) {
  return {
    id: video.id,
    title: video.title,
    thumbnail: getThumbnailUrl(video.thumbnail_url) ?? FALLBACK_THUMBNAIL,
    creator: video.uploaded_by ?? "Unknown",
    views: video.views ?? 0,
  };
}

function SearchResults() {
    const searchParams = useSearchParams();
    const query = searchParams.get("query").trim() ?? "";
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!query) {
            setVideos([]);
            setLoading(false);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);
        searchVideos(query)
        .then((data) => {
            const list = Array.isArray(data) ? data : (data.items ?? []);
            setVideos(list.map(toCardProps));
        })
        .catch((err) => {
            setError(err.message);
            setLoading(false);
        })
        .finally(() => {
            setLoading(false);
        });
    }, [query]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 size={24} className="animate-spin text-gray-500" />
            </div>
        );
    }

    if (!query) {
        return (
            <div className="flex flex-col items-center justify-center h-full">Enter a search query to find videos</div>
        )
    }

    if (error){
        return (
            <div className="flex flex-col items-center justify-center h-full">{error}</div>
        )
    }

    if (videos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full">No results found for "{query}"</div>
        )
    }

    return (
        <>
            <h2 className="text-2xl font-bold mb-6">Search Results for "{query}"</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {videos.map((video) => (
                    <VideoCard key={video.id} {...video} />
                ))}
            </div>
        </>
    )
}

export default function SearchPage() {
    return (
        <MainLayout>
            <Suspense fallback={<div className="flex justify-center items-center h-full">Loading...</div>}>
                <SearchResults />
            </Suspense>
        </MainLayout>
    )
}