"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Bell, Upload } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export default function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  return (
    <header className="sticky top-0 right-0 z-20 mx-auto bg-white/60 backdrop-blur-xl border-b border-white/30 h-20 px-8 flex items-center gap-4">
      <div className="flex-1 flex items-center gap-3 max-w-xl">
        <Search size={18} />
        <input type="text" placeholder="Search" className="cursor-text bg-transparent outline-none flex-1" />
      </div>
      <button className="cursor-pointer p-2 rounded-full hover:bg-white/10 transition-colors">
        <Bell size={18} />
      </button>
      {user ? (
        <Link
          href="/upload"
          className="flex items-center gap-2 p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <Upload size={18} />
          Upload
        </Link>
      ) : (
        <div className="flex items-center gap-2">
          <Link href="/login" className="px-4 py-2 text-sm font-medium hover:underline">
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80"
          >
            Sign up
          </Link>
        </div>
      )}
    </header>
  );
}