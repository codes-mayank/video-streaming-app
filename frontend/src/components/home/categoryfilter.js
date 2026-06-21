import { FILTER_CATEGORIES } from "@/lib/categories";

export default function CategoryFilter({ selected = "All", onSelect }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {FILTER_CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onSelect?.(category)}
          className={`cursor-pointer rounded-lg border px-3 py-2 transition-colors ${
            selected === category
              ? "border-black bg-black text-white"
              : "border-white/30 bg-white/60 backdrop-blur-xl hover:bg-white/80"
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
