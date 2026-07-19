import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import MainLayout from "../layout/mainLayout";

export default function AuthLayout({ children }) {
  return (
    <MainLayout>
    <div className="flex flex-1 flex-col items-center justify-center p-6">
    <Link
          href="/"
          className="mb-4 mr-auto inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-[var(--brand)]"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>
      <div className="w-full h-full mx-auto max-w-md">
        
        {children}
      </div>
    </div>
    </MainLayout>
  );
}
