"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MainLayout from "@/components/layout/mainLayout";
import GlassCard from "@/components/ui/glasscard";
import { getCurrentUser } from "@/lib/auth";
import { uploadVideo } from "@/lib/video";
import { DEFAULT_VIDEO_CATEGORY, VIDEO_CATEGORIES } from "@/lib/categories";

export default function UploadPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(DEFAULT_VIDEO_CATEGORY);
  const [file, setFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) router.replace("/login");
      else setUser(u);
    });
  }, [router]);

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [thumbnailFile]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setStatus("");

    if (!file) {
      setError("Please choose a video file.");
      return;
    }
    if (!file.type.startsWith("video/")) {
      setError("Only video files are allowed.");
      return;
    }
    if (!thumbnailFile) {
      setError("Please choose a thumbnail image.");
      return;
    }
    if (!thumbnailFile.type.startsWith("image/")) {
      setError("Thumbnail must be an image (JPEG, PNG, or WebP).");
      return;
    }

    setUploading(true);
    setStatus("Uploading video and thumbnail…");

    try {
      const result = await uploadVideo({
        title: title.trim(),
        description: description.trim(),
        file,
        thumbnailFile,
        userId: user.id,
        uploadedBy: user.username,
        category,
      });

      if (result.transcode_job_queued === false) {
        setError(
          `Upload saved but transcoding was not queued: ${result.transcode_queue_error || "check Kafka"}`
        );
        return;
      }

      setStatus("Upload complete! Transcoding started.");
      router.push(`/watch/${result.id}`);
    } catch (err) {
      setError(err.message);
      setStatus("");
    } finally {
      setUploading(false);
    }
  }

  if (!user) {
    return (
      <MainLayout>
        <p className="text-gray-500">Loading…</p>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
        ← Back to home
      </Link>

      <GlassCard className="mt-4 max-w-xl">
        <h1 className="text-2xl font-bold mb-6">Upload Video</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Enter title"
              className="w-full rounded-lg border border-black/40 bg-white/40 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Enter description"
              className="w-full rounded-lg border border-black/40 bg-white/40 px-3 py-2 outline-none resize-vertical"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium mb-1">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-black/40 bg-white/40 px-3 py-2 outline-none"
            >
              {VIDEO_CATEGORIES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Video file</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
              className="w-full text-sm bg-gray-500/40 rounded-lg border border-black/40 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Thumbnail</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
              required
              className="w-full text-sm bg-gray-500/40 rounded-lg border border-black/40 px-3 py-2 outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">JPEG, PNG, or WebP. Shown on the home page and search results.</p>
            {thumbnailPreview && (
              <div className="mt-3 overflow-hidden rounded-lg border border-white/30 bg-white/20">
                <img
                  src={thumbnailPreview}
                  alt="Thumbnail preview"
                  className="aspect-video w-full object-cover"
                />
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {status && <p className="text-gray-600 text-sm">{status}</p>}

          <button
            type="submit"
            disabled={uploading}
            className="w-full rounded-lg bg-black px-4 py-2 text-white font-medium hover:bg-black/80 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>
      </GlassCard>
    </MainLayout>
  );
}
