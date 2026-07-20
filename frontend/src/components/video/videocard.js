import Link from "next/link";
import { MoreVertical } from "lucide-react";
import Image from "next/image";
import { watchPath } from "@/lib/videoId";

const placeholderThumbnail = "https://placehold.co/320x180";

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
  if (!Number.isFinite(total)) return null;
  const h = Math.floor(total / 3600);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideoCard({
  id,
  title,
  thumbnail = placeholderThumbnail,
  creator,
  views,
  duration,
  progress,
  createdAtLabel,
}) {
  const durationLabel = formatDuration(duration);
  const hasProgress = typeof progress === "number" && progress > 0;

  return (
    <Link href={watchPath(id)} className="group block">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-zinc-200 shadow-sm">
        <Image
          src={thumbnail}
          alt={title}
          width={320}
          height={180}
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {durationLabel && (
          <span className="absolute bottom-2 right-2 rounded-sm bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">
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
          <div className="mt-1 flex justify-between items-center gap-1 text-sm text-zinc-500">
            <span className="truncate">{creator}</span>
            <div className="mt-0.5 text-xs text-zinc-400">
            {formatViews(views)}
            {createdAtLabel ? ` · ${createdAtLabel}` : ""}
            {hasProgress ? ` · ${Math.round(progress)}%` : ""}
            </div>
          </div>
          
        </div>
      </div>
    </Link>
  );
}
