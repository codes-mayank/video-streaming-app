import {
  LayoutGrid,
  Flame,
  Gamepad2,
  Music,
  Cpu,
  GraduationCap,
  Trophy,
  Clapperboard,
  ChevronDown,
} from "lucide-react";
import { FILTER_CATEGORIES } from "@/lib/categories";

const CATEGORY_ICONS = {
  All: LayoutGrid,
  Trending: Flame,
  Gaming: Gamepad2,
  Music: Music,
  Tech: Cpu,
  Education: GraduationCap,
  Sports: Trophy,
  Movies: Clapperboard,
  Other: Clapperboard,
};

export default function CategoryFilter({ selected = "All", onSelect }) {
  return (
    <div className="mb-8 flex overflow-x-auto scrollbar-hide [&::-webkit-scrollbar]:hidden items-center gap-2">
      {FILTER_CATEGORIES.map((category) => {
        const Icon = CATEGORY_ICONS[category] ?? LayoutGrid;
        const active = selected === category;
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect?.(category)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-[var(--brand)] bg-[var(--brand)] text-white shadow-sm shadow-rose-200"
                : "border-[var(--border)] bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            <Icon size={15} />
            {category}
          </button>
        );
      })}
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-white px-3.5 py-2 text-sm font-medium text-zinc-600"
      >
        More
        <ChevronDown size={14} />
      </button>
    </div>
  );
}
