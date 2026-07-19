"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Loader2,
  ArrowLeft,
  Check,
  ChevronRight,
  KeyRound,
  Globe,
  Link2,
  Shield,
  ShieldCheck,
  Trash2,
  Upload,
  User as UserIcon,
} from "lucide-react";
import { PencilSimpleIcon} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import MainLayout from "@/components/layout/mainLayout";
import { getCurrentUser, editProfile, uploadProfileImage } from "@/lib/auth";

const ACCOUNT_LINKS = [
  { icon: KeyRound, label: "Change Password" },
  { icon: Mail, label: "Email Preferences" },
  { icon: Shield, label: "Privacy Settings" },
  { icon: Link2, label: "Connected Accounts" },
];

export default function EditProfilePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        if (!user) {
          router.replace("/login");
          return;
        }
        setUsername(user.username ?? "");
        setEmail(user.email ?? "");
        setFullName(user.full_name ?? "");
        setProfileImageUrl(user.profile_image_url ?? "");
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setProfileFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  function handleRemovePhoto() {
    setProfileFile(null);
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (profileFile) {
        const newUrl = await uploadProfileImage(profileFile);
        setProfileImageUrl(newUrl);
        setProfileFile(null);
        setPreviewUrl("");
      }
      await editProfile({ username, email, fullName });
      setSuccess("Profile updated successfully.");
      router.refresh();
    } catch (err) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-zinc-400" />
        </div>
      </MainLayout>
    );
  }

  const avatarSrc = previewUrl || profileImageUrl;
  const avatarInitial = (fullName || username || "?").charAt(0).toUpperCase();

  return (
    <MainLayout>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-[var(--brand)]"
      >
        <ArrowLeft size={16} />
        Back to home
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Edit Profile
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Update your account details and profile information
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-[220px_minmax(0,1fr)]">
            {/* Profile picture column */}
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-[var(--brand-soft)]">
                  {avatarSrc ? (
                    <Image
                      src={avatarSrc}
                      alt="Profile"
                      width={128}
                      height={128}
                      className="h-32 w-32 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-[var(--brand)]">
                      {avatarInitial}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-md transition hover:bg-zinc-50"
                  aria-label="Change photo"
                >
                  <PencilSimpleIcon size={16} />
                </button>
              </div>

              <p className="mt-4 text-sm font-semibold text-zinc-800">Profile Picture</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                JPG, PNG or WEBP.
                <br />
                Max size of 2MB.
              </p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--brand-muted)] px-4 py-2 text-sm font-semibold text-[var(--brand)] transition-colors hover:bg-[var(--brand-soft)] disabled:opacity-50"
              >
                <Upload size={14} />
                Change Photo
              </button>

              {(previewUrl || profileFile) && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={loading}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-red-500 transition-colors hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
                disabled={loading}
              />
            </div>

            {/* Fields column */}
            <div className="space-y-5">
              <div>
                <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Username
                </label>
                <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 focus-within:border-[var(--brand)]">
                  <UserIcon size={16} className="shrink-0 text-zinc-400" />
                  <input
                    id="username"
                    type="text"
                    required
                    maxLength={50}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                    disabled={loading}
                  />
                  {username && <Check size={16} className="shrink-0 text-emerald-500" />}
                </div>
                <p className="mt-1.5 text-xs text-zinc-400">
                  This will be your unique identity on Umtube.
                </p>
              </div>

              <div>
                <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Full Name
                </label>
                <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 focus-within:border-[var(--brand)]">
                  <UserIcon size={16} className="shrink-0 text-zinc-400" />
                  <input
                    id="fullName"
                    type="text"
                    maxLength={100}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Email
                </label>
                <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 focus-within:border-[var(--brand)]">
                  <Mail size={16} className="shrink-0 text-zinc-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                    disabled={loading}
                  />
                  {email && <Check size={16} className="shrink-0 text-emerald-500" />}
                </div>
              </div>

              {error && (
                <p className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
                  {error}
                </p>
              )}
              {success && (
                <p className="rounded-xl bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-700">
                  {success}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex items-center justify-center gap-3 border-t border-zinc-100 pt-6">
            <Link
              href="/"
              className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {/* Right sidebar */}
        {/* <aside className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                <ShieldCheck size={16} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-zinc-900">Account</h2>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                  Manage your personal info and how it appears to others on Umtube.
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {ACCOUNT_LINKS.map(({ icon: Icon, label }) => (
                <li key={label}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon size={15} className="text-zinc-400" />
                      {label}
                    </span>
                    <ChevronRight size={15} className="text-zinc-300" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex gap-2.5 rounded-xl bg-[var(--brand-soft)] p-3.5">
              <Globe size={15} className="mt-0.5 shrink-0 text-[var(--brand)]" />
              <div className="text-xs leading-relaxed">
                <p className="font-semibold text-[var(--brand)]">Your profile is public</p>
                <p className="mt-0.5 text-zinc-500">
                  Anyone can see your profile, subscriptions and playlists.
                </p>
              </div>
            </div>
          </div>
        </aside> */}
      </div>
    </MainLayout>
  );
}
