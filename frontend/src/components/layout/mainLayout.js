"use client";

import { useEffect, useState } from "react";
import Navbar from "./navbar";
import Sidebar from "./sidebar";

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--surface)]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
        />
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <main className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
          {children}
        </main>
      </div>
    </div>
  );
}
