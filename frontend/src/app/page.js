import MainLayout from "@/components/layout/mainLayout";
import VideoSection from "@/components/home/videosection";
import CategoryFilter from "@/components/home/categoryfilter";

export default function Home() {
  return (
    <MainLayout>
      <CategoryFilter />
      <VideoSection title="Trending Videos" />
      <VideoSection title="Recommended Videos" />
    </MainLayout>
  );
}
