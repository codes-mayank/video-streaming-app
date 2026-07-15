"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Smile, ThumbsUp, Trash2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createComment, deleteComment, getComments } from "@/lib/video";

function formatTimeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export default function CommentsSection({ videoId }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const loadComments = useCallback(async (cursor) => {
    const data = await getComments(videoId, { cursor });
    setComments((prev) => (cursor ? [...prev, ...data.items] : data.items));
    setTotal(data.total);
    setNextCursor(data.next_cursor);
    setHasMore(data.has_more);
  }, [videoId]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError("");
      try {
        const [currentUser] = await Promise.all([
          getCurrentUser(),
          loadComments(),
        ]);
        if (!cancelled) setUser(currentUser);
      } catch (err) {
        if (!cancelled) setError(err.message ?? "Failed to load comments.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [loadComments]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    if (!user) {
      router.push("/login");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const comment = await createComment(videoId, trimmed);
      setComments((prev) => [comment, ...prev]);
      setTotal((count) => count + 1);
      setBody("");
    } catch (err) {
      if (err.message?.includes("Not authenticated")) {
        router.push("/login");
        return;
      }
      setError(err.message ?? "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLoadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    setError("");
    try {
      await loadComments(nextCursor);
    } catch (err) {
      setError(err.message ?? "Failed to load more comments.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleDelete(commentId) {
    setDeletingId(commentId);
    setError("");
    try {
      await deleteComment(videoId, commentId);
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      setTotal((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(err.message ?? "Failed to delete comment.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mt-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-zinc-900">
          Comments {total > 0 && <span className="font-semibold text-zinc-500">({total})</span>}
        </h2>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-800"
        >
          Sort by
          <ChevronDown size={14} />
        </button>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-8 flex items-start gap-3">
          {user.profile_image_url ? (
            <Image
              src={user.profile_image_url}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-600">
              {(user.username || user.name || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 shadow-sm">
            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a comment..."
              maxLength={2000}
              disabled={submitting}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400 disabled:opacity-60"
            />
            <Smile size={18} className="shrink-0 text-zinc-400" />
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="shrink-0 rounded-full bg-[var(--brand)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : "Comment"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mb-8 text-sm text-zinc-500">
          <Link href="/login" className="font-medium text-[var(--brand)] hover:underline">
            Log in
          </Link>{" "}
          to leave a comment.
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-[var(--brand-soft)] px-3 py-2 text-sm text-[var(--brand)]">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-zinc-400" />
        </div>
      ) : comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          No comments yet. Be the first to comment.
        </p>
      ) : (
        <ul className="space-y-5">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-600">
                {comment.username?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm">
                    <span className="font-semibold text-zinc-900">{comment.username}</span>{" "}
                    <span className="text-xs text-zinc-400">{formatTimeAgo(comment.created_at)}</span>
                  </p>
                  {comment.is_owner && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      disabled={deletingId === comment.id}
                      aria-label="Delete comment"
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-[var(--brand)] disabled:opacity-60"
                    >
                      {deletingId === comment.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{comment.body}</p>
                <div className="mt-2 flex items-center gap-4 text-xs font-medium text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <ThumbsUp size={12} />
                    Like
                  </span>
                  <span>Reply</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasMore && !loading && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="mt-5 w-full rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
        >
          {loadingMore ? "Loading..." : "Load more comments"}
        </button>
      )}
    </section>
  );
}
