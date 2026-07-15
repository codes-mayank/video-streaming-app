"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2 } from "lucide-react";
import { subscribeToChannel, unsubscribeFromChannel, checkSubscription } from "@/lib/video";

export default function SubscribeButton({ userId, initialSubscribed = false }) {
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    checkSubscription(userId)
      .then((subscription) => {
        setSubscribed(subscription !== null);
      })
      .catch(() => {});
  }, [userId]);

  async function handleToggle() {
    setLoading(true);
    setError("");
    try {
      if (subscribed) {
        await unsubscribeFromChannel(userId);
        setSubscribed(false);
      } else {
        await subscribeToChannel(userId);
        setSubscribed(true);
      }
    } catch (err) {
      if (err.message?.includes("Not authenticated") || err.message?.includes("401")) {
        router.push("/login");
        return;
      }
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading || !userId}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            subscribed
              ? "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
              : "bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]"
          }`}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {subscribed ? "Subscribed" : "Subscribe"}
        </button>
        {subscribed && (
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            aria-label="Notifications"
          >
            <Bell size={16} />
          </button>
        )}
      </div>
      {error && <p className="text-xs text-[var(--brand)]">{error}</p>}
    </div>
  );
}
