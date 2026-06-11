import Navbar from "./navbar";
import Sidebar from "./sidebar";

export default function MainLayout({ children }) {
  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <main className="flex-1 overflow-y-auto p-6 space-y-8">
          <Navbar />
          <div className="p-6 space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}