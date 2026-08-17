import React from "react";
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
        "flex flex-col items-center justify-center gap-1 flex-1 h-14 rounded-[16px] transition-all duration-300 relative",
        active
          ? "text-orange-600"
          : "text-orange-950/30 hover:text-orange-600/60"
      )}
    >
      {active && (
        <motion.div
          layoutId="active-nav-bg"
          className="absolute inset-0 bg-orange-100/50 rounded-[16px] -z-10"
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
  if (activeTab === "oauth-consent") return null;

  const nav = (
    <nav
      id="bottom-nav"
      className="fixed bottom-6 left-6 right-6 max-w-[calc(448px-3rem)] mx-auto z-50"
    >
      <div
        id="nav-container"
        className="backdrop-blur-2xl bg-white/80 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[24px] p-2 flex items-center justify-between gap-2 border border-white/50 w-full"
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
              className="w-full h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-[16px] shadow-[0_8px_30px_rgb(251,146,60,0.4)] flex items-center justify-center text-white relative overflow-hidden cursor-pointer"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_white_0%,_transparent_40%)] opacity-30" />
              <Plus className="w-7 h-7 stroke-[3px]" />
            </motion.button>
          ) : (
            <div
              id="fab-disabled"
              className="w-full h-14 bg-stone-50 border border-stone-200/50 rounded-[16px] flex flex-col items-center justify-center text-stone-400 select-none opacity-60"
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
  );

  // The dashboard root is transformed on narrow Samsung viewports. A fixed
  // descendant of a transformed ancestor is no longer fixed to the browser
  // viewport, so portal the nav directly to <body> to keep it viewport-fixed.
  return createPortal(nav, document.body);
}
