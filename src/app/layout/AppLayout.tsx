import { Outlet } from "react-router-dom";
import { useState } from "react";
import { Header } from "@/app/layout/Header";
import { Sidebar } from "@/app/layout/Sidebar";
import { useDemo } from "@/app/context/DemoContext";
import { AppDataSkeleton } from "@/app/components/common/LoadingStates";
import { translate } from "@/app/lib/i18n";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { loading, settings } = useDemo();

  return (
    <div className="app-root flex min-h-dvh overflow-hidden bg-background text-slate-100">
      <a href="#main-content" className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition focus:translate-y-0">{translate(settings.language, "skipContent")}</a>
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="ambient-orb ambient-float absolute -left-48 -top-48 h-[500px] w-[500px] rounded-full opacity-[0.18] blur-[72px]" style={{ background: "radial-gradient(circle, #0ea5e9 0%, transparent 70%)" }} />
        <div className="ambient-orb ambient-float absolute right-[-160px] top-1/3 h-[420px] w-[420px] rounded-full opacity-[0.13] blur-[64px] [animation-delay:-4s]" style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)" }} />
        <div className="ambient-orb absolute bottom-[-128px] left-1/4 h-[360px] w-[360px] rounded-full opacity-[0.1] blur-[56px]" style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }} />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "linear-gradient(rgba(14,165,233,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.8) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main id="main-content" tabIndex={-1} className="relative flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {loading ? <AppDataSkeleton /> : <Outlet />}
        </main>
      </div>
    </div>
  );
}
