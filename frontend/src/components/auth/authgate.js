"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import MainLayout from "@/components/layout/mainLayout";
import { useGetCurrentUserQuery } from "@/lib/redux/api";

export default function AuthGate({ children, feature }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading } = useGetCurrentUserQuery();

  useEffect(() => {
    if (isLoading || user) return;
    const params = new URLSearchParams({ next: pathname });
    if (feature) params.set("feature", feature);
    router.replace(`/login-required?${params.toString()}`);
  }, [isLoading, user, router, pathname, feature]);

  if (isLoading || !user) {
    return (
      <MainLayout>
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-gray-500" />
        </div>
      </MainLayout>
    );
  }

  return children;
}
