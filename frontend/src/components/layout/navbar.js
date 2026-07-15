"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, User as UserIcon, ChevronDown } from "lucide-react";
import { getCurrentUser, logout } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("query") ?? "");

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    setSearchQuery(searchParams.get("query") ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (!dropdownOpen) return;

    function handlePointerDown(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [dropdownOpen]);

  function handleSearch(e) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/search?query=${encodeURIComponent(q)}`);
  }

  const displayName =
    user?.full_name || user?.name || user?.username || "Account";

  return (
    <header className="sticky top-0 z-20 mb-6 w-9/10 mx-auto flex items-center gap-4">
      <form
        onSubmit={handleSearch}
        className="flex h-12 flex-1 items-center gap-3 rounded-full border border-[var(--border)] bg-white px-4 shadow-sm"
      >
        <Search size={18} className="shrink-0 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search videos, channels..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
        />
        <kbd className="hidden shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 sm:inline">
          ⌘ K
        </kbd>
      </form>

      <div className="flex items-space-between gap-2">
        {/* <button
          type="button"
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-white text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--brand)] px-1 text-[10px] font-bold text-white">
            3
          </span>
        </button> */}

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-white py-1.5 pl-1.5 pr-3 shadow-sm transition-colors hover:bg-zinc-50"
          >
            {user?.profile_image_url ? (
              <Image
                src={user.profile_image_url}
                alt="Profile"
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100">
                <UserIcon size={16} className="text-zinc-500" />
              </div>
            )}
            <span className="hidden max-w-[100px] truncate text-sm font-medium text-zinc-800 sm:inline">
              {user ? displayName : "Guest"}
            </span>
            <ChevronDown size={14} className="text-zinc-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-xl">
              {user ? (
                <div className="flex flex-col items-center gap-3 p-5">
                  {user.profile_image_url ? (
                    <Image
                      src={user.profile_image_url}
                      alt="Profile"
                      width={72}
                      height={72}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-zinc-100">
                      <UserIcon size={28} className="text-zinc-400" />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-base font-semibold">{displayName}</p>
                    <p className="mt-0.5 text-sm text-zinc-500">{user.email}</p>
                  </div>
                  <div className="mt-1 flex w-full flex-col gap-2 border-t border-zinc-100 pt-3">
                    <Link
                      href="/upload"
                      onClick={() => setDropdownOpen(false)}
                      className="rounded-xl bg-[var(--brand)] py-2 text-center text-sm font-medium text-white transition-colors hover:bg-[var(--brand-hover)]"
                    >
                      Upload
                    </Link>
                    <Link
                      href="/edit-profile"
                      onClick={() => setDropdownOpen(false)}
                      className="rounded-xl border border-zinc-200 py-2 text-center text-sm font-medium transition-colors hover:bg-zinc-50"
                    >
                      Edit profile
                    </Link>
                    <Link
                      href="/"
                      onClick={() => {setDropdownOpen(false); logout(); setUser(null); router.refresh();}}
                      className="rounded-xl border border-zinc-200 py-2 text-center text-sm font-medium transition-colors hover:bg-zinc-50"
                    >
                      Logout
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 p-5 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
                    <UserIcon size={28} className="text-zinc-400" />
                  </div>
                  <p className="text-sm text-zinc-500">You&apos;re not logged in.</p>
                  <div className="flex w-full flex-col gap-2">
                    <Link
                      href="/login"
                      onClick={() => setDropdownOpen(false)}
                      className="rounded-xl bg-[var(--brand)] py-2 text-center text-sm font-medium text-white hover:bg-[var(--brand-hover)]"
                    >
                      Login
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setDropdownOpen(false)}
                      className="rounded-xl border border-zinc-200 py-2 text-center text-sm font-medium hover:bg-zinc-50"
                    >
                      Sign up
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
