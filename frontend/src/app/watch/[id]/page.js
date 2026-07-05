"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MainLayout from "@/components/layout/mainLayout";
import VideoPlayer from "@/components/auth/videoplayer";
import LikeButton from "@/components/video/likebutton";
import CommentsSection from "@/components/video/commentssection";
import { getVideo, getPlaybackSource } from "@/lib/video";

export default function WatchPage() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getVideo(id)
      .then(setVideo)
      .catch((err) => setError(err.message));
  }, [id]);

  const playbackUrl = video?.playback_url ?? null;
  const playerOptions = useMemo(() => {
    const source = playbackUrl ? getPlaybackSource(playbackUrl) : null;
    return {
      controls: true,
      fluid: true,
      autoplay: true,
      sources: source ? [source] : [],
    };
  }, [playbackUrl]);

  return (
    <MainLayout>
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
        ← Back to home
      </Link>

      {error && <p className="text-red-500 mt-4">{error}</p>}
      {!video && !error && <p className="text-gray-500 mt-4">Loading video...</p>}

      {video && (
        <div className="mt-4 max-w-4xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">{video.title}</h1>
            <LikeButton
              videoId={video.id}
              initialCount={video.like_count ?? 0}
              initialLiked={Boolean(video.liked)}
            />
          </div>
          {playbackUrl ? (
            <VideoPlayer key={id} options={playerOptions} />
          ) : (
            <p className="text-gray-500">
              This video is not ready for playback yet. Wait for transcoding to finish.
            </p>
          )}
          <CommentsSection videoId={video.id} />
        </div>
      )}
    </MainLayout>
  );
}
