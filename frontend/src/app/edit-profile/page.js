"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Loader2 } from "lucide-react";
import Image from "next/image";
import AuthLayout from "@/components/auth/authlayout";
import GlassCard from "@/components/ui/glasscard";
import { getCurrentUser, editProfile, uploadProfileImage } from "@/lib/auth";

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

function handleImageChange(e){
    const file = e.target.files?.[0];
    if (file){
        setProfileFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    }
}

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
    //   await editProfile({ username, email, fullName });
      if (profileFile){
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
      <AuthLayout>
        <GlassCard className="mx-auto flex w-full max-w-md items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-gray-500" />
        </GlassCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <GlassCard className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Edit Profile</h1>
          <p className="mt-2 text-sm text-gray-500">Update your account details</p>
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
                placeholder="Enter your username"
                className="w-full bg-transparent outline-none"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="profileImage" className="text-sm font-medium">
              Profile Image
            </label>
            <div className="flex items-center gap-3 rounded-lg border border-white/30 bg-white/40 px-3 py-2">
              {(previewUrl || profileImageUrl) && (
                <Image src={previewUrl || profileImageUrl} alt="Profile Image" width={100} height={100} className="w-10 h-10 object-cover rounded-full" />
              ) } 
              <input type="file" id="profileImage" accept="image/*" onChange={handleImageChange} className="w-full bg-transparent outline-none" disabled={loading} />
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
                maxLength={100}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full bg-transparent outline-none"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {success && (
            <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700">{success}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </form>
      </GlassCard>
    </AuthLayout>
  );
}
