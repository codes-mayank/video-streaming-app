export default function VideoCard({title, thumbnail, creator, views}) {
    return (
        <div className="bg-white/60 backdrop-blur-xl border border-white/30 rounded-lg p-6 shadow-lg">
            <div className="relative aspect-video rounded-lg overflow-hidden">
                <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
            </div>
            <h3 className="text-lg font-medium">{title}</h3>
            <p className="text-sm text-gray-500">{creator}</p>
            <p className="text-sm text-gray-500">{views} views</p>
        </div>
    )
}