import VideoCard from "../video/videocard";
import { videos } from "../../data/videos";

export default function VideoGrid() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {videos.map((video) => (
                <VideoCard key={video.id} {...video} />
            ))}
        </div>
    )
}