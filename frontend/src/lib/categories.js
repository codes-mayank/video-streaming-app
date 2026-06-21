export const VIDEO_CATEGORIES = [
  { value: "gaming", label: "Gaming" },
  { value: "music", label: "Music" },
  { value: "tech", label: "Tech" },
  { value: "education", label: "Education" },
  { value: "sports", label: "Sports" },
  { value: "other", label: "Other" },
];

export const DEFAULT_VIDEO_CATEGORY = "other";

export const FILTER_CATEGORIES = ["All", "Trending", ...VIDEO_CATEGORIES.map((c) => c.label)];

export function getCategoryLabel(value) {
  return VIDEO_CATEGORIES.find((c) => c.value === value)?.label ?? "Other";
}

export function categoryLabelToValue(label) {
  if (label === "All" || label === "Trending") return null;
  return VIDEO_CATEGORIES.find((c) => c.label === label)?.value ?? null;
}
