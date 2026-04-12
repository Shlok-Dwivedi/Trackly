import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import Navbar from "./Navbar";
import { cn } from "@/lib/utils";
import { GradientMesh } from "@/components/effects/GradientMesh";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  className?: string;
}

export default function Layout({ children, title, showBack, className }: LayoutProps) {
  return (
    <div className="h-screen overflow-hidden bg-background relative gradient-bg">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <GradientMesh />
      </div>

      {/* Two-column grid — sidebar + main, both h-full */}
      <div className="h-full grid grid-cols-1 md:grid-cols-[auto_1fr] relative z-10">

        {/* Sidebar */}
        <aside className="hidden md:block h-full">
          <Sidebar />
        </aside>

        {/* Main area */}
        <main className="relative flex flex-col h-full overflow-hidden">
          {/* Mobile top nav */}
          <div className="md:hidden shrink-0 z-40 safe-top">
            <Navbar title={title} showBack={showBack} />
          </div>

          {/* Scrollable content */}
          <div className={cn("relative z-10 flex-1 overflow-y-auto overflow-x-hidden", className)}>
            <div className="p-4 md:p-6 pb-24 md:pb-6">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 safe-bottom">
        <BottomNav />
      </div>
    </div>
  );
}
