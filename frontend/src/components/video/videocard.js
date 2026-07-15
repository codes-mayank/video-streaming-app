import Link from "next/link";
import { MoreVertical, BadgeCheck } from "lucide-react";

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

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return null;
  const total = Math.max(0, Math.floor(Number(seconds)));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideoCard({
  id,
  title,
  thumbnail,
  creator,
  views,
  likeCount = 0,
  duration,
  progress,
  createdAtLabel,
}) {
  const durationLabel = formatDuration(duration);
  const hasProgress = typeof progress === "number" && progress > 0;

  return (
    <Link href={`/watch/${id}`} className="group block">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-zinc-200 shadow-sm">
        <img
          src={thumbnail}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {durationLabel && (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {durationLabel}
          </span>
        )}
        {hasProgress && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/30">
            <div
              className="h-full bg-[var(--brand)]"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900">
              {title}
            </h3>
            <MoreVertical
              size={16}
              className="mt-0.5 shrink-0 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100"
            />
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-zinc-500">
            <span className="truncate">{creator}</span>
            <BadgeCheck size={14} className="shrink-0 text-sky-500" />
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {formatViews(views)}
            {likeCount > 0 ? ` · ${likeCount} ${likeCount === 1 ? "like" : "likes"}` : ""}
            {createdAtLabel ? ` · ${createdAtLabel}` : ""}
            {hasProgress ? ` · ${Math.round(progress)}%` : ""}
          </p>
        </div>
      </div>
    </Link>
  );
}
