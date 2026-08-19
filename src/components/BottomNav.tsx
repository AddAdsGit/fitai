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
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 relative cursor-pointer select-none border-none",
        active
          ? "text-orange-600 bg-orange-500/10 font-black"
          : "text-stone-400 hover:text-stone-600 font-bold hover:bg-stone-50"
      )}
    >
      <Icon
        className={cn("w-6 h-6", active ? "stroke-[2.5px]" : "stroke-[2px]")}
      />
      <span className="text-[10px] uppercase tracking-wider leading-none">
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

  useEffect(() => {
    setMounted(true);
  }, []);

  if (activeTab === "oauth-consent" || !mounted) return null;

  const nav = (
    <div
      id="bottom-nav-viewport-layer"
      className="fixed bottom-0 left-0 right-0 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto w-full sm:max-w-md z-[600] bg-white/95 backdrop-blur-2xl border-t sm:border-x border-stone-200 shadow-[0_-4px_25px_rgba(0,0,0,0.05)] rounded-none pb-[max(12px,env(safe-area-inset-bottom,12px))] pt-2 px-4"
    >
      <nav id="bottom-nav" className="w-full">
        <div
          id="nav-container"
          className="flex items-center justify-between gap-3 w-full"
        >
          {/* Home Tab (1/3 Equal Width) */}
          <NavButton
            id="nav-home"
            icon={Home}
            label="Home"
            active={activeTab === "home"}
            onClick={() => setActiveTab("home")}
          />

          {/* Center Action Button (1/3 Equal Width) */}
          <div className="flex-1 flex justify-center">
            {selectedDate === todayStr ? (
              <motion.button
                id="fab-add-food"
                type="button"
                onClick={handleLogMealClick}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                className="w-full h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl shadow-lg shadow-orange-500/30 flex items-center justify-center text-white relative overflow-hidden cursor-pointer border-none"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_white_0%,_transparent_40%)] opacity-30 pointer-events-none" />
                <Plus className="w-7 h-7 stroke-[3px]" />
              </motion.button>
            ) : (
              <div
                id="fab-disabled"
                className="w-full h-14 bg-stone-100 border border-stone-200 rounded-2xl flex flex-col items-center justify-center text-stone-400 select-none opacity-60"
                title="Logs are only editable on today's date"
              >
                <Plus className="w-5 h-5 stroke-[2px]" />
                <span className="text-[8px] font-black uppercase tracking-widest mt-0.5">
                  Locked
                </span>
              </div>
            )}
          </div>

          {/* Profile Tab (1/3 Equal Width) */}
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
