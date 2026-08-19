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
        "flex flex-col items-center justify-center gap-0.5 flex-1 h-11 rounded-[16px] transition-all duration-300 relative cursor-pointer select-none border-none bg-transparent",
        active
          ? "text-orange-600"
          : "text-orange-950/40 hover:text-orange-600/70"
      )}
    >
      {active && (
        <motion.div
          layoutId="active-nav-bg"
          className="absolute inset-0 bg-orange-100/60 rounded-[16px] -z-10"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
      <Icon
        className={cn("w-4.5 h-4.5", active ? "stroke-[2.5px] text-orange-600" : "stroke-[2px]")}
      />
      <span className={cn("text-[8px] font-black uppercase tracking-wider", active ? "text-orange-950 font-black" : "text-orange-950/50")}>
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

    const updateViewportScale = () => {
      const width = Math.max(1, window.innerWidth);
      setViewportScale(Math.min(1, Math.max(0.8, width / 412)));
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
        bottom: `max(10px, env(safe-area-inset-bottom, 8px))`,
        width: `calc(100vw / ${viewportScale} - 40px)`,
        maxWidth: `${320 / viewportScale}px`,
        transform: `translateX(-50%) scale(${viewportScale})`,
        transformOrigin: "bottom center",
        zIndex: 600,
        isolation: "isolate",
      }}
    >
      <nav id="bottom-nav" className="w-full">
        <div
          id="nav-container"
          className="backdrop-blur-xl bg-white/90 shadow-[0_10px_30px_rgba(249,115,22,0.12),0_2px_10px_rgba(0,0,0,0.04)] rounded-[22px] p-1.5 flex items-center justify-between gap-1.5 border border-white/90 w-full"
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
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                className="w-full h-11 bg-gradient-to-br from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 rounded-[15px] shadow-[0_4px_16px_rgba(249,115,22,0.35)] flex items-center justify-center text-white relative overflow-hidden cursor-pointer border-none"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_white_0%,_transparent_40%)] opacity-35" />
                <Plus className="w-6 h-6 stroke-[3px]" />
              </motion.button>
            ) : (
              <div
                id="fab-disabled"
                className="w-full h-11 bg-stone-50 border border-stone-200/50 rounded-[15px] flex flex-col items-center justify-center text-stone-400 select-none opacity-60"
                title="Logs are only editable on today's date"
              >
                <Plus className="w-4 h-4 stroke-[2px]" />
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
