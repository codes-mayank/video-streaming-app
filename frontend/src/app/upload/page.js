"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  ClipboardList,
  CloudUpload,
  FileVideo,
  Image as ImageIcon,
  Lightbulb,
  ListChecks,
  Sparkles,
  Trash2,
  Loader2,
} from "lucide-react";
import MainLayout from "@/components/layout/mainLayout";
import { getCurrentUser } from "@/lib/auth";
import { uploadVideo } from "@/lib/video";
import { watchPath } from "@/lib/videoId";
import { DEFAULT_VIDEO_CATEGORY, VIDEO_CATEGORIES } from "@/lib/categories";

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 5000;

const UPLOAD_CHECKLIST = [
  {
    icon: FileVideo,
    title: "Check your video",
    text: "Ensure your video is in a supported format and size.",
  },
  {
    icon: ClipboardList,
    title: "Add details",
    text: "Write a clear title and description to help viewers find your video.",
  },
  {
    icon: ImageIcon,
    title: "Choose a thumbnail",
    text: "A custom thumbnail helps your video stand out.",
  },
  {
    icon: CheckCircle2,
    title: "Follow community guidelines",
    text: "Make sure your content follows our community guidelines.",
  },
];

const VIDEO_REQUIREMENTS = [
  "Format: MP4, MOV, AVI, WebM",
  "Resolution: 720p or higher recommended",
  "Aspect ratio: 16:9 (landscape)",
  "Max file size: 10GB",
  "Max duration: 4 hours",
];

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export default function UploadPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(DEFAULT_VIDEO_CATEGORY);
  const [file, setFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const videoInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

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

  function handleVideoDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  function handleClearAll() {
    setTitle("");
    setDescription("");
    setCategory(DEFAULT_VIDEO_CATEGORY);
    setFile(null);
    setThumbnailFile(null);
    setError("");
    setStatus("");
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  }

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
    if (thumbnailFile && !thumbnailFile.type.startsWith("image/")) {
      setError("Thumbnail must be an image (JPEG, PNG, or WebP).");
      return;
    }

    setUploading(true);
    setStatus(
      thumbnailFile
        ? "Uploading video and thumbnail…"
        : "Uploading video… A thumbnail will be generated automatically."
    );

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
      router.push(watchPath(result.id));
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
        <p className="text-zinc-500">Loading…</p>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-[var(--brand)]"
      >
        <ArrowLeft size={16} />
        Back to home
      </Link>

      <div className="mt-4 flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
          <CloudUpload size={24} />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Upload Video</h1>
          <p className="text-sm text-zinc-500">Share your content with the world</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            {/* Video dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleVideoDrop}
              className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragActive
                  ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                  : "border-zinc-200 bg-zinc-50/50"
              }`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
                <ArrowUp size={22} />
              </span>
              {file ? (
                <>
                  <p className="max-w-full truncate text-sm font-semibold text-zinc-900">
                    {file.name}
                  </p>
                  <p className="text-xs text-zinc-400">{formatFileSize(file.size)}</p>
                </>
              ) : (
                <p className="text-sm font-semibold text-zinc-700">
                  Drag &amp; drop your video file here
                  <span className="mt-0.5 block text-xs font-normal text-zinc-400">or</span>
                </p>
              )}
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-hover)]"
              >
                {file ? "Change File" : "Choose File"}
              </button>
              <p className="text-xs text-zinc-400">MP4, MOV, AVI, WebM up to 10GB</p>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>

            {/* Title */}
            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                Title <span className="text-[var(--brand)]">*</span>
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 focus-within:border-[var(--brand)]">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                  required
                  placeholder="Enter an engaging title"
                  className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                />
                <span className="shrink-0 text-xs text-zinc-400">
                  {title.length}/{TITLE_MAX}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Description</label>
              <div className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 focus-within:border-[var(--brand)]">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
                  rows={4}
                  placeholder="Tell viewers about your video..."
                  className="w-full resize-y bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                />
                <p className="text-right text-xs text-zinc-400">
                  {description.length}/{DESCRIPTION_MAX}
                </p>
              </div>
            </div>

            {/* Category */}
            <div className="mt-5 sm:max-w-sm">
              <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-zinc-700">
                Category <span className="text-[var(--brand)]">*</span>
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-[var(--brand)]"
              >
                {VIDEO_CATEGORIES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Thumbnail */}
            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                Thumbnail <span className="font-normal text-zinc-400">(optional)</span>
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
                <button
                  type="button"
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="flex min-h-[120px] flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-5 text-center transition-colors hover:border-[var(--brand)]"
                >
                  {thumbnailPreview ? (
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      className="aspect-video w-full rounded-lg object-cover"
                    />
                  ) : (
                    <>
                      <ImageIcon size={22} className="text-[var(--brand)]" />
                      <span className="text-sm font-semibold text-[var(--brand)]">
                        Upload thumbnail
                      </span>
                      <span className="text-xs text-zinc-400">JPG, PNG or WebP. Max 5MB.</span>
                      <span className="text-xs text-zinc-400">
                        If omitted, the middle video frame will be used.
                      </span>
                    </>
                  )}
                </button>
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />

                <div className="rounded-2xl bg-[var(--brand-soft)] p-4 text-sm">
                  <p className="flex items-center gap-1.5 font-semibold text-zinc-800">
                    <Sparkles size={14} className="text-[var(--brand)]" />
                    Tip
                  </p>
                  <p className="mt-1 text-zinc-600">
                    A good thumbnail stands out and gets more clicks!
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                    <li>✓ Use 1280x720px (16:9) or higher</li>
                    <li>✓ JPG, PNG or WebP format</li>
                    <li>✓ Max size 5MB</li>
                  </ul>
                </div>
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
            {status && <p className="mt-4 text-sm text-zinc-600">{status}</p>}

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-5">
              <button
                type="button"
                onClick={handleClearAll}
                disabled={uploading}
                className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-red-500 disabled:opacity-50"
              >
                <Trash2 size={15} />
                Clear all
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-50"
              >
                {uploading && <Loader2 size={15} className="animate-spin" />}
                {uploading ? "Uploading…" : "Upload Video"}
              </button>
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                <ListChecks size={16} className="text-[var(--brand)]" />
                Before you upload
              </h2>
              <ul className="mt-4 space-y-4">
                {UPLOAD_CHECKLIST.map(({ icon: Icon, title: itemTitle, text }) => (
                  <li key={itemTitle} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                      <Icon size={15} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-800">{itemTitle}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                <Lightbulb size={16} className="text-[var(--brand)]" />
                Video requirements
              </h2>
              <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-zinc-500">
                {VIDEO_REQUIREMENTS.map((req) => (
                  <li key={req} className="flex gap-2">
                    <span className="text-[var(--brand)]">•</span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </form>
    </MainLayout>
  );
}
