"use client";

import Link from "next/link";
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
import { usePathname } from "next/navigation";

const menuItems = [
  {icon: Home, label: "Home", href: "/"},
  // {icon: Flame, label: "Trending", href: "/trending"},
  {icon: PlaySquare, label: "Subscriptions", href: "/subscriptions"},
  {icon: History, label: "Watch History", href: "/watch-history"},
  {icon: Heart, label: "Liked Videos", href: "/likedvideos"},
  // {icon: ListVideo, label: "Watch History", href: "/watch-history"},
];

function isActive(pathname, href){
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="shrink-0 overflow-hidden top-0 z-10 left-0 h-full w-72 bg-white/60 backdrop-blur-xl border-r border-white/30 p-6 flex flex-col">
      <div className="mb-10">
        <h1 className="cursor-pointer text-2xl font-bold">
          <Link href="/"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            Umtube
          </Link>
        </h1>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors
               ${active ? "bg-white/20 font-medium" : "hover:bg-white/10"}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  )
}