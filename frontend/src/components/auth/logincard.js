"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { Mail, Lock, Loader2 } from "lucide-react";
import GlassCard from "@/components/ui/glasscard";
import { getCurrentUser, login, googleLogin } from "@/lib/auth";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

function LoginForm() {
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((user) => {
        if (!cancelled && user) {
          router.replace("/");
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCheckingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(usernameOrEmail, password);
      router.push("/");
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
      router.push("/");
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
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-2 text-sm text-gray-500">Sign in to continue to Umtube</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium">
            Username or Email
          </label>
          <div className="flex items-center gap-3 rounded-lg border border-white/30 bg-white/40 px-3 py-2">
            <Mail size={18} className="shrink-0 text-gray-500" />
            <input
              id="username"
              type="text"
              required
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="Enter your username or email"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full bg-transparent outline-none"
              disabled={loading}
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded border-white/30"
            disabled={loading}
          />
          Remember me
        </label>

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
              Signing in...
            </>
          ) : (
            "Sign In"
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
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-black hover:underline">
          Sign up
        </Link>
      </p>
    </GlassCard>
  );
}

export default function LoginCard() {
  if (!GOOGLE_CLIENT_ID) {
    return <LoginForm />;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LoginForm />
    </GoogleOAuthProvider>
  );
}
