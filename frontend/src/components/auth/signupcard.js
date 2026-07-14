"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { Mail, Lock, User, Loader2 } from "lucide-react";
import GlassCard from "@/components/ui/glasscard";
import { getCurrentUser, signup, googleLogin } from "@/lib/auth";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

function getSafeNext(next) {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/";
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = getSafeNext(searchParams.get("next"));
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      await signup({ username, email, fullName, password });
      router.push(next);
    } catch (err) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    setError("");
    setLoading(true);

    try {
      const token = credentialResponse?.credential;
      if (!token) {
        throw new Error("Google sign-in did not return a credential.");
      }

      await googleLogin(token);
      router.push(next);
    } catch (err) {
      setError(err.message ?? "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <GlassCard className="flex w-full max-w-md items-center justify-center py-16">
        <Loader2 size={28} className="animate-spin text-gray-500" />
      </GlassCard>
    );
  }

  return (
    <GlassCard className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-2 text-sm text-gray-500">Join Umtube to upload and watch videos</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium">
            Username
          </label>
          <div className="flex items-center gap-3 rounded-lg border border-white/30 bg-white/40 px-3 py-2">
            <User size={18} className="shrink-0 text-gray-500" />
            <input
              id="username"
              type="text"
              required
              maxLength={50}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              className="w-full bg-transparent outline-none"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <div className="flex items-center gap-3 rounded-lg border border-white/30 bg-white/40 px-3 py-2">
            <Mail size={18} className="shrink-0 text-gray-500" />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full bg-transparent outline-none"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium">
            Full Name
          </label>
          <div className="flex items-center gap-3 rounded-lg border border-white/30 bg-white/40 px-3 py-2">
            <User size={18} className="shrink-0 text-gray-500" />
            <input
              id="fullName"
              type="text"
              required
              maxLength={100}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full bg-transparent outline-none"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <div className="flex items-center gap-3 rounded-lg border border-white/30 bg-white/40 px-3 py-2">
            <Lock size={18} className="shrink-0 text-gray-500" />
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              className="w-full bg-transparent outline-none"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm Password
          </label>
          <div className="flex items-center gap-3 rounded-lg border border-white/30 bg-white/40 px-3 py-2">
            <Lock size={18} className="shrink-0 text-gray-500" />
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="w-full bg-transparent outline-none"
              disabled={loading}
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      {GOOGLE_CLIENT_ID && (
        <>
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/30" />
            <span className="text-xs text-gray-500">or</span>
            <div className="h-px flex-1 bg-white/30" />
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google sign-in failed. Please try again.")}
              theme="outline"
              size="large"
              text="continue_with"
              shape="rectangular"
              width="100%"
            />
          </div>
        </>
      )}

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          href={next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-black hover:underline"
        >
          Sign in
        </Link>
      </p>
    </GlassCard>
  );
}

function SignupFormWithSuspense() {
  return (
    <Suspense
      fallback={
        <GlassCard className="flex w-full max-w-md items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-gray-500" />
        </GlassCard>
      }
    >
      <SignupForm />
    </Suspense>
  );
}

export default function SignupCard() {
  if (!GOOGLE_CLIENT_ID) {
    return <SignupFormWithSuspense />;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <SignupFormWithSuspense />
    </GoogleOAuthProvider>
  );
}
