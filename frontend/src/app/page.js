"use client";

import { useState } from "react";
import MainLayout from "@/components/layout/mainLayout";
import VideoSection from "@/components/home/videosection";
import CategoryFilter from "@/components/home/categoryfilter";
import ContinueWatching from "@/components/home/continuewatching";
import Latest from "@/components/layout/latest";
import { categoryLabelToValue } from "@/lib/categories";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const categoryFilter = categoryLabelToValue(selectedCategory);

  return (
    <MainLayout>
      <Latest />
      <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
      <VideoSection title="Trending Videos" category={categoryFilter} href="/" />
      <ContinueWatching />
    </MainLayout>
  );
}
