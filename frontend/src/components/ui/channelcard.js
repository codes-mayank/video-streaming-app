import Link from "next/link";
import Image from "next/image";
import { User } from "lucide-react";
import { SealCheck} from "@phosphor-icons/react";
import { channelPath } from "@/lib/videoId";

const ACCENT_STYLES = [
  { button: "bg-[var(--brand-soft)] text-[var(--brand)] hover:bg-[var(--brand-muted)]" },
  { button: "bg-sky-50 text-sky-700 hover:bg-sky-100" },
  { button: "bg-orange-50 text-orange-700 hover:bg-orange-100" },
  { button: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
  { button: "bg-rose-50 text-rose-700 hover:bg-rose-100" },
];

export default function ChannelCard({
  id,
  username,
  fullName,
  profileImageUrl,
  accentIndex = 0,
}) {
  const accent = ACCENT_STYLES[accentIndex % ACCENT_STYLES.length];
  const displayName = fullName || username;
  const bio =
    fullName && fullName !== username
      ? `Updates and uploads from ${fullName}.`
      : `Follow ${username} for new videos and channel updates.`;

  return (
    <article className="relative flex h-full w-[220px] shrink-0 flex-col items-center rounded-2xl border border-zinc-100 bg-white p-5 text-center shadow-sm sm:w-[240px]">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
        {profileImageUrl ? (
          <Image
            src={profileImageUrl}
            alt={displayName}
            width={80}
            height={80}
            className="h-full w-full object-cover"
          />
        ) : (
          <User size={36} />
        )}
      </div>

      <h3 className="mt-4 flex max-w-full items-center justify-center gap-1 text-base font-semibold text-zinc-900">
        <span className="truncate">{username}</span>
        <SealCheck size={16} weight="fill" className="shrink-0 text-sky-500" />
      </h3>

      <p className="mt-1 text-xs text-zinc-400">Subscribed channel</p>

      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-zinc-500">
        {bio}
      </p>

      <Link
        href={channelPath(id)}
        className={`mt-4 inline-flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${accent.button}`}
      >
        View Channel
      </Link>
    </article>
  );
}
