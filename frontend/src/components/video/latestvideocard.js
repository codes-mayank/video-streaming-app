import Link from "next/link";
import { Play, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { PlayCircle } from "@phosphor-icons/react";
import Image from "next/image";
import { watchPath } from "@/lib/videoId";

function formatViews(count) {
  const views = Number(count) || 0;
  if (views >= 1_000_000) {
    const value = views / 1_000_000;
    return `${value >= 10 ? Math.round(value) : value.toFixed(1).replace(/\.0$/, "")}M views`;
  }
  if (views >= 1_000) {
    return `${Math.round(views / 1_000)}K views`;
  }
  return `${views} views`;
}

function formatTimeAgo(dateString) {
  if (!dateString) return "Recently uploaded";
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
  return `${Math.floor(seconds / 2592000)} months ago`;
}

export default function LatestVideoCard({
  id,
  title,
  description,
  thumbnail,
  views,
  likeCount,
  category,
  createdAt,
}) {
  const meta = [
    formatViews(views),
    likeCount > 0 ? `${likeCount} ${likeCount === 1 ? "like" : "likes"}` : null,
    formatTimeAgo(createdAt),
    category,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <Link href={watchPath(id)}>
    <article className="group relative overflow-hidden bg-zinc-900">
      <div className="relative h-[230px] w-full sm:h-[200px] lg:h-[220px]">
        <Image
          src={thumbnail}
          alt={title}
          fill
          sizes="100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/5" />

        {/* <div className="absolute right-4 top-4 flex gap-2">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            aria-label="Previous"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            aria-label="Next"
          >
            <ChevronRight size={16} />
          </button>
        </div> */}

        <span className="absolute left-4 top-4 rounded-full bg-[var(--brand)] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
          Featured
        </span>

        <PlayCircle size={100} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-50" />

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 lg:p-6 transition-all duration-500">
          <h2 className="max-w-2xl text-xl font-bold leading-tight text-white sm:text-2xl lg:text-[1.75rem]">
            {title}
          </h2>
          <p className="mt-1.5 max-w-xl line-clamp-2 text-md text-white/85">
            {description?.trim() || meta}
          </p>
        </div>

        {/* <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          <span className="h-1.5 w-5 rounded-full bg-[var(--brand)]" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
        </div> */}
      </div>
    </article>
    </Link>
  );
}
