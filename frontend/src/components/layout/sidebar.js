"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  House,
  Video,
  ClockCounterClockwise,
  Heart,
  Clock,
  List,
  Play,
  Sun,
  Moon,
} from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { getCurrentUser, onAuthChanged } from "@/lib/auth";
import { getSubscriptions } from "@/lib/video";
import { channelPath } from "@/lib/videoId";

const THEME_CHANGED_EVENT = "theme-changed";

function subscribeToTheme(callback) {
  window.addEventListener(THEME_CHANGED_EVENT, callback);
  return () => window.removeEventListener(THEME_CHANGED_EVENT, callback);
}

function getThemeSnapshot() {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerThemeSnapshot() {
  return "light";
}

const menuItems = [
  { icon: House, label: "Home", href: "/" },
  { icon: Video, label: "Subscriptions", href: "/subscriptions" },
  { icon: ClockCounterClockwise, label: "Watch History", href: "/watch-history" },
  { icon: Heart, label: "Liked Videos", href: "/likedvideos" },
];

function isActive(pathname, href) {
  if (href === "/") return pathname === href;
  const path = href.split("?")[0];
  return pathname === path || pathname.startsWith(`${path}/`);
}

function ChannelAvatar({ name, imageUrl }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <div className="relative shrink-0">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600">
          {initial}
        </div>
      )}
      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white bg-[var(--brand)]" />
    </div>
  );
}

export default function Sidebar({ open = false, onClose }) {
  const pathname = usePathname();
  const [subscriptions, setSubscriptions] = useState([]);
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem("theme", nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGED_EVENT));
  }

  useEffect(() => {
    let cancelled = false;

    function loadSubscriptions() {
      getCurrentUser()
        .then((user) => {
          if (cancelled) return null;
          if (!user) {
            setSubscriptions([]);
            return null;
          }
          return getSubscriptions();
        })
        .then((channels) => {
          if (cancelled || !channels) return;
          const list = Array.isArray(channels) ? channels : channels.items ?? [];
          setSubscriptions(list.slice(0, 5));
        })
        .catch(() => {
          if (!cancelled) setSubscriptions([]);
        });
    }

    loadSubscriptions();
    const unsubscribe = onAuthChanged(loadSubscriptions);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return (
    <aside
      className={`app-sidebar fixed inset-y-0 left-0 z-40 flex h-full w-[280px] shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-white px-4 py-5 shadow-2xl transition-transform duration-300 ease-out lg:static lg:z-auto lg:w-[250px] lg:translate-x-0 lg:shadow-none ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" onClick={onClose} className="flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand)] text-white shadow-sm shadow-rose-200">
            <Play size={18} fill="currentColor" />
          </span>
          <span className="text-xl font-bold tracking-tight text-zinc-900">Umtube</span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = item.highlight === false ? false : isActive(pathname, item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-[var(--brand-muted)] font-semibold text-[var(--brand-hover)] "
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              <Icon size={18} weight={active ? "fill" : "regular"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between px-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Your Subscriptions
          </h3>
        </div>
        <div className="space-y-1 overflow-y-auto">
          {subscriptions.length === 0 ? (
            <p className="px-2 text-xs text-zinc-400">No subscriptions yet</p>
          ) : (
            subscriptions.map((channel) => (
              <Link
                key={channel.id ?? channel.username}
                href={channelPath(channel.id)}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                <ChannelAvatar
                  name={channel.username ?? channel.full_name}
                  imageUrl={channel.profile_image_url}
                />
                <span className="truncate font-medium">
                  {channel.username ?? channel.full_name}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600"
        >
          <span className="flex items-center gap-2">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </span>
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              theme === "dark" ? "bg-blue-400" : "bg-zinc-300"
            }`}
          />
        </button>
      </div>
    </aside>
  );
}
