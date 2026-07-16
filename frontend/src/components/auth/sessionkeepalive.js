"use client";

import { useEffect } from "react";
import { refreshSession } from "@/lib/auth";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

export default function SessionKeepAlive() {
  useEffect(() => {
    let cancelled = false;

    const tryRefresh = () => {
      if (cancelled || document.visibilityState === "hidden") return;
      refreshSession().catch(() => {});
    };

    tryRefresh();
    const intervalId = window.setInterval(tryRefresh, REFRESH_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        tryRefresh();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
