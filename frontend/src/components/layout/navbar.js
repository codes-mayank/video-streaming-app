"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, User as UserIcon } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("query") ?? "");

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    setSearchQuery(searchParams.get("query") ?? "");
  }, [searchParams]);

  function handleSearch(e) {
    e.preventDefault();
    router.push(`/search?query=${searchQuery}`);
  }

  return (
    <>
      <header className="sticky top-0 right-0 z-20 rounded-2xl w-9/10 mx-auto bg-white/60 backdrop-blur-xl border-b border-white/30 h-20 px-8 flex justify-between items-center gap-3">
        <div className="flex items-center gap-3 max-w-xl w-full">
          <Search size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
            placeholder="Search"
            className="cursor-text bg-gray-100/60 w-full rounded-full px-4 py-2 outline-none flex-1"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center p-1 rounded-full hover:bg-black/5 transition-colors"
          >
            {user?.profile_image_url ? (
              <Image
                src={user.profile_image_url}
                alt="Profile"
                width={36}
                height={36}
                className="rounded-full"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                <UserIcon size={18} className="text-gray-500" />
              </div>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-5 w-72  rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              {user ? (
                <div className="p-5 backdrop-blur-sm bg-white/95 flex flex-col items-center gap-3">
                  <Image
                    src={user.profile_image_url}
                    alt="Profile"
                    width={72}
                    height={72}
                    className="rounded-full"
                  />
                  <div className="text-center">
                    <p className="font-semibold text-base">{user.name}</p>
                    <p className="text-black-400 text-sm mt-0.5">{user.email}</p>
                  </div>

                  <div className="w-full border-t pt-3 mt-1 flex flex-col gap-2">
                    <Link
                      href="/upload"
                      onClick={() => setDropdownOpen(false)}
                      className="text-center py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/80 transition-colors"
                    >
                      Upload
                    </Link>
                    <Link
                      href="/edit-profile"
                      onClick={() => setDropdownOpen(false)}
                      className="text-center py-2 rounded-xl border text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Edit profile
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-5 flex flex-col items-center gap-3 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <UserIcon size={28} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">You're not logged in.</p>
                  <div className="w-full flex flex-col gap-2">
                    <Link
                      href="/login"
                      onClick={() => setDropdownOpen(false)}
                      className="text-center py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/80 transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setDropdownOpen(false)}
                      className="text-center py-2 rounded-xl border text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Sign up
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
}