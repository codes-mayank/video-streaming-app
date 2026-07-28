import {
  LayoutGrid,
  Cpu,
  Code,
  Brain,
  GraduationCap,
  Gamepad2,
  Music,
  Sparkles,
  Trophy,
  Newspaper,
  Clapperboard,
  FlaskConical,
  Briefcase,
  CircleDollarSign,
  Heart,
  Plane,
  UtensilsCrossed,
  Dumbbell,
  Shirt,
  Camera,
  Palette,
  Film,
  Hammer,
  Car,
  PawPrint,
  Leaf,
  Landmark,
  Mic,
  Laugh,
  Video,
  Baby,
  FileVideo,
  ChevronDown,
} from "lucide-react";
import { FILTER_CATEGORIES } from "@/lib/categories";

const CATEGORY_ICONS = {
  All: LayoutGrid,
  Technology: Cpu,
  Programming: Code,
  "Artificial Intelligence": Brain,
  Education: GraduationCap,
  Gaming: Gamepad2,
  Music: Music,
  Entertainment: Sparkles,
  Sports: Trophy,
  News: Newspaper,
  "Movies & TV": Clapperboard,
  Science: FlaskConical,
  Business: Briefcase,
  Finance: CircleDollarSign,
  Lifestyle: Heart,
  Travel: Plane,
  "Food & Cooking": UtensilsCrossed,
  "Health & Fitness": Dumbbell,
  "Fashion & Beauty": Shirt,
  Photography: Camera,
  "Art & Design": Palette,
  Animation: Film,
  "DIY & Crafts": Hammer,
  Automobiles: Car,
  "Pets & Animals": PawPrint,
  Nature: Leaf,
  History: Landmark,
  Podcasts: Mic,
  Comedy: Laugh,
  Vlogs: Video,
  Kids: Baby,
  "Short Films": Film,
  Documentaries: FileVideo,
  Other: LayoutGrid,
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
            className={`inline-flex whitespace-nowrap cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-[var(--chip-active)] bg-[var(--chip-active)] text-[var(--chip-text)] shadow-sm"
                : "border-[var(--border)] bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:bg-[var(--chip-hover)]"
            }`}
          >
            <Icon size={15} />
            {category}
          </button>
        );
      })}
    </div>
  );
}
