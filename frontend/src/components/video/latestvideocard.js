import Link from "next/link";
import { Play } from "lucide-react";

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
  thumbnail,
  views,
  category,
  createdAt,
}) {
  const meta = [formatViews(views), formatTimeAgo(createdAt), category]
    .filter(Boolean)
    .join(" • ");

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/20 bg-black shadow-lg">
      <div className="relative aspect-[21/9] min-h-[220px] w-full sm:min-h-[280px] lg:min-h-[320px]">
        <img
          src={thumbnail}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

        <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm sm:left-6 sm:top-6">
          Featured
        </span>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 lg:p-8">
          <h2 className="max-w-3xl text-xl font-bold leading-tight text-white sm:text-2xl lg:text-3xl">
            {title}
          </h2>
          <p className="mt-2 text-sm text-white/75 sm:text-base">{meta}</p>

          <Link
            href={`/watch/${id}`}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-white/90"
          >
            <Play size={16} fill="currentColor" />
            Watch Now
          </Link>
        </div>
      </div>
    </article>
  );
}
