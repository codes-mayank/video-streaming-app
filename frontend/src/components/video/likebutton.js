"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
import { likeVideo, unlikeVideo } from "@/lib/video";

export default function LikeButton({ videoId, initialCount = 0, initialLiked = false }) {
  const router = useRouter();
  const [likeCount, setLikeCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleToggle() {
    setError("");
    setLoading(true);

    try {
      const result = liked ? await unlikeVideo(videoId) : await likeVideo(videoId);
      setLikeCount(result.like_count);
      setLiked(result.liked);
    } catch (err) {
      if (err.message?.includes("Not authenticated") || err.message?.includes("401")) {
        router.push("/login");
        return;
      }
      setError(err.message ?? "Could not update like.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        aria-pressed={liked}
        aria-label={liked ? "Unlike video" : "Like video"}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          liked
            ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Heart size={18} className={liked ? "fill-current" : ""} />
        )}
        {likeCount} {likeCount === 1 ? "like" : "likes"}
      </button>
      {error && (
        <p className="text-sm text-red-600">
          {error}{" "}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </p>
      )}
    </div>
  );
}
