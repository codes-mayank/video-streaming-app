export const VIDEO_CATEGORIES = [
  { value: "technology", label: "Technology" },
  { value: "programming", label: "Programming" },
  { value: "artificial-intelligence", label: "Artificial Intelligence" },
  { value: "education", label: "Education" },
  { value: "gaming", label: "Gaming" },
  { value: "music", label: "Music" },
  { value: "entertainment", label: "Entertainment" },
  { value: "sports", label: "Sports" },
  { value: "news", label: "News" },
  { value: "movies-tv", label: "Movies & TV" },
  { value: "science", label: "Science" },
  { value: "business", label: "Business" },
  { value: "finance", label: "Finance" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "travel", label: "Travel" },
  { value: "food-cooking", label: "Food & Cooking" },
  { value: "health-fitness", label: "Health & Fitness" },
  { value: "fashion-beauty", label: "Fashion & Beauty" },
  { value: "photography", label: "Photography" },
  { value: "art-design", label: "Art & Design" },
  { value: "animation", label: "Animation" },
  { value: "diy-crafts", label: "DIY & Crafts" },
  { value: "automobiles", label: "Automobiles" },
  { value: "pets-animals", label: "Pets & Animals" },
  { value: "nature", label: "Nature" },
  { value: "history", label: "History" },
  { value: "podcasts", label: "Podcasts" },
  { value: "comedy", label: "Comedy" },
  { value: "vlogs", label: "Vlogs" },
  { value: "kids", label: "Kids" },
  { value: "short-films", label: "Short Films" },
  { value: "documentaries", label: "Documentaries" },
  { value: "other", label: "Other" },
];

export const DEFAULT_VIDEO_CATEGORY = "other";

export const FILTER_CATEGORIES = ["All", ...VIDEO_CATEGORIES.map((c) => c.label)];

export function getCategoryLabel(value) {
  return VIDEO_CATEGORIES.find((c) => c.value === value)?.label ?? "Other";
}

export function categoryLabelToValue(label) {
  if (label === "All" || label === "Trending") return null;
  return VIDEO_CATEGORIES.find((c) => c.label === label)?.value ?? null;
}
