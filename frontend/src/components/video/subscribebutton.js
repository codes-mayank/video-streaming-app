"use client";

import { useState, useEffect } from "react";
import { subscribeToChannel, unsubscribeFromChannel, checkSubscription } from "@/lib/video";


export default function SubscribeButton({ userId, initialSubscribed = false }) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    checkSubscription(userId).then((subscription) => {
      setSubscribed(subscription !== null);
    });
  }, [userId]);
  async function handleSubscribe() {
    setLoading(true);
    setError("");
    try {
      await subscribeToChannel(userId);
      setSubscribed(true);
    } catch (err) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnsubscribe() {
    setLoading(true);
    setError("");
    try {
      await unsubscribeFromChannel(userId);
      setSubscribed(false);
    } catch (err) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className={`${subscribed ? "bg-gray-400" : "bg-blue-500"} text-white px-4 py-2 rounded-md cursor-pointer`} onClick={subscribed ? handleUnsubscribe : handleSubscribe}>
      {subscribed ? "Unsubscribe" : "Subscribe"}
    </button>
  );
}