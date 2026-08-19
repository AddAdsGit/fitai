import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Home, User, Plus } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

interface NavButtonProps {
  id: string;
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}

export function NavButton({
  id,
  icon: Icon,
  label,
  active,
  onClick,
}: NavButtonProps) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 flex-1 h-12 rounded-[14px] transition-all duration-300 relative",
        active
          ? "text-orange-600"
          : "text-orange-950/40 hover:text-orange-600/60"
      )}
    >
      {active && (
        <motion.div
          layoutId="active-nav-bg"
          className="absolute inset-0 bg-orange-100/60 rounded-[14px] -z-10"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <Icon
        className={cn("w-5 h-5", active ? "stroke-[2.5px]" : "stroke-[2px]")}
      />
      <span className="text-[8px] font-black uppercase tracking-[0.1em]">
        {label}
      </span>
    </button>
  );
}

export interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedDate: string;
  todayStr: string;
  handleLogMealClick: () => void;
}

export function BottomNav({
  activeTab,
  setActiveTab,
  selectedDate,
  todayStr,
  handleLogMealClick,
}: BottomNavProps) {
  const [mounted, setMounted] = useState(false);
  const [viewportScale, setViewportScale] = useState(1);

  useEffect(() => {
    setMounted(true);

    // Samsung's display/page zoom can reduce the CSS viewport from ~412px to
    // ~320px while increasing the physical size of every CSS pixel. Scale the
    // viewport-owned nav by the same inverse factor so its physical size stays
    // consistent without changing the dashboard layout.
    const updateViewportScale = () => {
      const width = Math.max(1, window.innerWidth);
      setViewportScale(Math.min(1, Math.max(0.75, width / 412)));
    };

    updateViewportScale();
    window.addEventListener("resize", updateViewportScale);
    window.visualViewport?.addEventListener("resize", updateViewportScale);
    return () => {
      window.removeEventListener("resize", updateViewportScale);
      window.visualViewport?.removeEventListener("resize", updateViewportScale);
    };
  }, []);

  if (activeTab === "oauth-consent" || !mounted) return null;

  const nav = (
    <div
      id="bottom-nav-viewport-layer"
      style={{
        position: "fixed",
        left: "50%",
        bottom: `calc(env(safe-area-inset-bottom, 0px) + ${10 * viewportScale}px)`,
        width: `calc(100vw / ${viewportScale} - 32px)`,
        maxWidth: `${390 / viewportScale}px`,
        transform: `translateX(-50%) scale(${viewportScale})`,
        transformOrigin: "bottom center",
        zIndex: 600,
        isolation: "isolate",
      }}
    >
      <nav id="bottom-nav" className="w-full">
        <div
          id="nav-container"
          className="backdrop-blur-2xl bg-white/85 shadow-[0_12px_36px_rgba(249,115,22,0.14)] rounded-[22px] p-1.5 flex items-center justify-between gap-1.5 border border-white/80 w-full"
        >
          <NavButton
            id="nav-home"
            icon={Home}
            label="Home"
            active={activeTab === "home"}
            onClick={() => setActiveTab("home")}
          />

          <div className="flex-1 flex justify-center">
            {selectedDate === todayStr ? (
              <motion.button
                id="fab-add-food"
                onClick={handleLogMealClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-[14px] shadow-[0_6px_20px_rgb(251,146,60,0.35)] flex items-center justify-center text-white relative overflow-hidden cursor-pointer"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_white_0%,_transparent_40%)] opacity-30" />
                <Plus className="w-6 h-6 stroke-[3px]" />
              </motion.button>
            ) : (
              <div
                id="fab-disabled"
                className="w-full h-12 bg-stone-50 border border-stone-200/50 rounded-[14px] flex flex-col items-center justify-center text-stone-400 select-none opacity-60"
                title="Logs are only editable on today's date"
              >
                <Plus className="w-5 h-5 stroke-[2px]" />
                <span className="text-[7px] font-black uppercase tracking-widest mt-0.5">
                  Locked
                </span>
              </div>
            )}
          </div>

          <NavButton
            id="nav-profile"
            icon={User}
            label="Profile"
            active={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
          />
        </div>
      </nav>
    </div>
  );

  return createPortal(nav, document.body);
}
