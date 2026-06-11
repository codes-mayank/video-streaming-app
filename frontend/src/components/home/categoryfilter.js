const categories = [
    "All",
    "Trending",
    "Gaming",
    "Music",
    "Tech",
    "Education",
    "Sports",
];

export default function CategoryFilter() {
    return (
        <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
                <button key={category} className="cursor-pointer bg-white/60 backdrop-blur-xl border border-white/30 rounded-lg p-2 hover:bg-white/10 transition-colors">{category}</button>
            ))}
        </div>
    );
}