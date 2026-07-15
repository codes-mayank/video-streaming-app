import Navbar from "./navbar";
import Sidebar from "./sidebar";

export default function MainLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--surface)]">
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-5 lg:px-8">
          <Navbar />
          {children}
        </main>
      </div>
    </div>
  );
}
