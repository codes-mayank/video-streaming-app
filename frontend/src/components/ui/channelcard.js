import Link from "next/link";
import {User} from "lucide-react";

export default function ChannelCard({ id, username, fullName, profileImageUrl }) {
    return (
        <Link
            href={`/`}
            className="bg-white/60 backdrop-blur-xl border border-white/30 rounded-lg p-6 shadow-lg block hover:shadow-xl transition-shadow flex flex-col items-center gap-4"
        >
            <div className="relative w-24 h-24 rounded-full overflow-hidden">
                {profileImageUrl  ? (
                    <img src={profileImageUrl} alt={username} className="w-full h-full object-cover rounded-full" />
                ) : (
                    <User className="w-full h-full object-cover rounded-full" />
                )}
            </div>
            <h3 className="text-lg font-medium">{username}</h3>
            <p className="text-sm text-gray-500 font-medium">
              {fullName}
            </p>
        </Link>
    )
}