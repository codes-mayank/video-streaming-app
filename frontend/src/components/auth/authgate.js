"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import MainLayout from "@/components/layout/mainLayout";
import { getCurrentUser } from "@/lib/auth";

export default function AuthGate({ children, feature }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        if (!user) {
          const params = new URLSearchParams({ next: pathname });
          if (feature) params.set("feature", feature);
          router.replace(`/login-required?${params.toString()}`);
          return;
        }
        setAllowed(true);
      })
      .catch(() => {
        if (cancelled) return;
        const params = new URLSearchParams({ next: pathname });
        if (feature) params.set("feature", feature);
        router.replace(`/login-required?${params.toString()}`);
      });

    return () => {
      cancelled = true;
    };
  }, [router, pathname, feature]);

  if (!allowed) {
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
