import VideoGrid from "./videogrid";

export default function VideoSection({title, videos}) {
    return (
        <div className="mb-10">
            <h2 className="text-2xl font-bold mb-6">Trending Videos</h2>
            <VideoGrid />
        </div>
    )
}