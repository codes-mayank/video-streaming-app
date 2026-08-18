"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  rtkErrorMessage,
  useCheckSubscriptionQuery,
  useSubscribeMutation,
  useUnsubscribeMutation,
} from "@/lib/redux/api";

export default function SubscribeButton({ userId, initialSubscribed = false }) {
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [subscribe] = useSubscribeMutation();
  const [unsubscribe] = useUnsubscribeMutation();
  const { data: subscription } = useCheckSubscriptionQuery(userId, {
    skip: !userId,
  });

  useEffect(() => {
    if (subscription === undefined) return;
    setSubscribed(subscription != null);
  }, [subscription]);

  async function handleToggle() {
    if (loading || !userId) return;

    const previous = subscribed;
    const next = !previous;

    // Optimistic UI: flip immediately, queue Kafka write in the background.
    setSubscribed(next);
    setLoading(true);
    setError("");

    try {
      if (next) {
        await subscribe(userId).unwrap();
      } else {
        await unsubscribe(userId).unwrap();
      }
    } catch (err) {
      setSubscribed(previous);
      const message = rtkErrorMessage(err);
      if (message.includes("Not authenticated") || err?.status === 401) {
        router.push("/login");
        return;
      }
      setError(message);
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
          className={`cursor-pointer inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            subscribed
              ? "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
              : "bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]"
          }`}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {subscribed ? "Subscribed" : "Subscribe"}
        </button>
      </div>
      {error && <p className="text-xs text-[var(--brand)]">{error}</p>}
    </div>
  );
}
