"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import MainLayout from "@/components/layout/mainLayout";
import GlassCard from "@/components/ui/glasscard";
import { getCurrentUser } from "@/lib/auth";

function getSafeNext(next) {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/";
}

const FEATURE_LABELS = {
  subscriptions: "your subscriptions",
  "watch-history": "your watch history",
  likedvideos: "your liked videos",
};

function LoginRequiredContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = getSafeNext(searchParams.get("next"));
  const featureKey = searchParams.get("feature");
  const featureLabel = FEATURE_LABELS[featureKey] ?? "this page";
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((user) => {
        if (!cancelled && user) {
          router.replace(next);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCheckingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router, next]);

  const loginHref = `/login?next=${encodeURIComponent(next)}`;
  const signupHref = `/signup?next=${encodeURIComponent(next)}`;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <GlassCard className="w-full max-w-md text-center space-y-5">
        {checkingSession ? (
          <div className="flex justify-center py-8">
            <Loader2 size={28} className="animate-spin text-gray-500" />
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold">You&apos;re not logged in</h2>
            <p className="text-gray-600">
              Sign in or create an account to view {featureLabel}.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href={loginHref}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-black text-white px-4 py-2.5 font-medium hover:bg-black/90 transition-colors"
              >
                <LogIn size={18} />
                Log in
              </Link>
              <Link
                href={signupHref}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium hover:bg-gray-50 transition-colors"
              >
                <UserPlus size={18} />
                Sign up
              </Link>
            </div>
          </>
        )}
      </GlassCard>
    </div>
  );
}

export default function LoginRequiredPage() {
  return (
    <MainLayout>
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-gray-500" />
          </div>
        }
      >
        <LoginRequiredContent />
      </Suspense>
    </MainLayout>
  );
}
