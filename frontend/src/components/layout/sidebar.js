"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  House,
  Video,
  ClockCounterClockwise,
  Heart,
  Clock,
  List,
  Play,
  Sun,
  CaretDown,
} from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSubscriptions } from "@/lib/video";

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
        <img
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

export default function Sidebar() {
  const pathname = usePathname();
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (!user || cancelled) return null;
        return getSubscriptions();
      })
      .then((channels) => {
        if (cancelled || !channels) return;
        const list = Array.isArray(channels) ? channels : channels.items ?? [];
        setSubscriptions(list.slice(0, 5));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="flex h-full w-[250px] shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-white px-4 py-5">
      <Link href="/" className="mb-8 flex items-center gap-2.5 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand)] text-white shadow-sm shadow-rose-200">
          <Play size={18} fill="currentColor" />
        </span>
        <span className="text-xl font-bold tracking-tight text-zinc-900">Umtube</span>
      </Link>

      <nav className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = item.highlight === false ? false : isActive(pathname, item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
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
                href="/subscriptions"
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
        {/* <div className="rounded-2xl bg-gradient-to-br from-[var(--brand)] to-rose-700 p-4 text-white shadow-lg shadow-rose-200/60">
          <p className="text-sm font-semibold">Go Premium</p>
          <p className="mt-1 text-xs text-white/80">
            Ad-free watching and exclusive content.
          </p>
          <button
            type="button"
            className="mt-3 w-full rounded-full bg-white px-3 py-2 text-xs font-semibold text-[var(--brand)] transition-colors hover:bg-rose-50"
          >
            Upgrade Now
          </button>
        </div> */}

        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600"
        >
          <span className="flex items-center gap-2">
            <Sun size={16} />
            Light Mode
          </span>
          <CaretDown size={16} className="text-zinc-400" />
        </button>
      </div>
    </aside>
  );
}
