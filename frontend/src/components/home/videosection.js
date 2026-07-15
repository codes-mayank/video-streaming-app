import Link from "next/link";
import { Flame, History } from "lucide-react";
import VideoGrid from "./videogrid";

const SECTION_ICONS = {
  "Trending Videos": Flame,
  "Continue Watching": History,
};

export default function VideoSection({ title, category, href = "/" }) {
  const Icon = SECTION_ICONS[title] ?? Flame;

  return (
    <section className="mb-10">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900 sm:text-xl">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
            <Icon size={16} />
          </span>
          {title}
        </h2>
        <Link
          href={href}
          className="text-sm font-medium text-[var(--brand)] hover:text-[var(--brand-hover)]"
        >
          View all
        </Link>
      </div>
      <VideoGrid category={category} />
    </section>
  );
}
