"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThumbsUp, Loader2 } from "lucide-react";
import { likeVideo, unlikeVideo } from "@/lib/video";

function formatCount(count) {
  const n = Number(count) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

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
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          liked
            ? "bg-[var(--brand-soft)] text-[var(--brand)]"
            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
        }`}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <ThumbsUp size={16} className={liked ? "fill-current" : ""} />
        )}
        {formatCount(likeCount)}
      </button>
      {error && (
        <p className="text-sm text-[var(--brand)]">
          {error}{" "}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </p>
      )}
    </div>
  );
}
