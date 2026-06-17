"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Upload } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("query") ?? "");

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);
  useEffect(() =>{
    setSearchQuery(searchParams.get("query") ?? "");
  }, [searchParams]);

  function handleSearch(e) {
    e.preventDefault();
    router.push(`/search?query=${searchQuery}`);
  }

  return (
    <header className="sticky top-0 right-0 z-20  bg-white/60 backdrop-blur-xl border-b border-white/30 h-20 px-8 flex justify-between gap-4">
      <div className="flex items-center gap-3 max-w-xl">
        <Search size={18} />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onSubmit={handleSearch} onKeyDown={(e) => e.key === "Enter" && handleSearch(e)} placeholder="Search" className="cursor-text bg-gray-100 rounded-full px-4 py-2 outline-none flex-1" />
      </div>
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