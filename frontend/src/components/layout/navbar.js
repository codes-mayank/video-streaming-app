"use client";

import { Search, Bell, Upload} from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 right-0 z-20 mx-auto bg-white/60 backdrop-blur-xl border-b border-white/30 h-20 px-8 flex items-center gap-4">
      <div className="flex-1 flex items-center gap-3 max-w-xl">
        <Search size={18} />
        <input type="text" placeholder="Search" className="cursor-text bg-transparent outline-none flex-1" />
      </div>
        <button className="cursor-pointer p-2 rounded-full hover:bg-white/10 transition-colors">
          <Bell size={18} />
        </button>
        <div className="cursor-pointer flex items-center gap-2">
          <button className="cursor-pointer p-2 rounded-full hover:bg-white/10 transition-colors">
            <Upload size={18} />Upload
          </button>
        </div>
      <div className="container mx-auto px-4 py-3 flex items-center justify-between"></div>
    </header>
  )
}