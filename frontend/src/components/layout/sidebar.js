"use client";

import {
  Home,
  Flame,
  PlaySquare,
  History,
  Heart,
  ListVideo,
  Settings,
  User,
} from "lucide-react";

const menuItems = [
  {icon: Home, label: "Home"},
  {icon: Flame, label: "Trending"},
  {icon: PlaySquare, label: "Subscriptions"},
  {icon: History, label: "History"},
  {icon: Heart, label: "Liked Videos"},
  {icon: ListVideo, label: "Watch Later"},
];

export default function Sidebar() {
  return (
    <aside className="shrink-0 overflow-hidden top-0 z-10 left-0 h-full w-72 bg-white/60 backdrop-blur-xl border-r border-white/30 p-6 flex flex-col">
      <div className="mb-10">
        <h1 className="text-2xl font-bold">
          Umtube
        </h1>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  )
}