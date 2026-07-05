"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare, Trash2 } from "lucide-react";
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
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white/70 p-5">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare size={20} className="text-gray-600" />
        <h2 className="text-lg font-semibold">
          Comments {total > 0 && <span className="text-gray-500">({total})</span>}
        </h2>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-6 space-y-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            maxLength={2000}
            disabled={submitting}
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400 disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400">{body.length}/2000</span>
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              Comment
            </button>
          </div>
        </form>
      ) : (
        <p className="mb-6 text-sm text-gray-500">
          <Link href="/login" className="font-medium text-black underline">
            Log in
          </Link>{" "}
          to leave a comment.
        </p>
      )}

      {error && <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">No comments yet. Be the first to comment.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3 border-b border-gray-100 pb-4 last:border-b-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                {comment.username?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{comment.username}</p>
                    <p className="text-xs text-gray-400">{formatTimeAgo(comment.created_at)}</p>
                  </div>
                  {comment.is_owner && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      disabled={deletingId === comment.id}
                      aria-label="Delete comment"
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-60"
                    >
                      {deletingId === comment.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{comment.body}</p>
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
          className="mt-4 w-full rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {loadingMore ? "Loading..." : "Load more comments"}
        </button>
      )}
    </section>
  );
}
