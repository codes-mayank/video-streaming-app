import VideoGrid from "./videogrid";

export default function VideoSection({ title, category }) {
  return (
    <div className="mb-10">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      <VideoGrid category={category} />
    </div>
  );
}