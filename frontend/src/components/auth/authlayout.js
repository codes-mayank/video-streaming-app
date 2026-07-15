import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-blue-100 p-6">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-[var(--brand)]"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>
        {children}
      </div>
    </div>
  );
}
