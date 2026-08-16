import React from "react";
import { Flame } from "lucide-react";
import { motion } from "motion/react";
import type { Profile } from "../types";
import { DefaultAvatar } from "./DefaultAvatar";
import { DEFAULT_CUSTOM_GPT_URL } from "../constants/app";
import { ChatGPTIcon } from "./ChatGPTIcon";

export interface HeaderProps {
  currentStreak: number;
  profileData: Profile;
  setActiveTab: (tab: string) => void;
}

export function Header({ currentStreak, profileData, setActiveTab }: HeaderProps) {
  const gptUrl = localStorage.getItem("fitai_custom_gpt_url") || DEFAULT_CUSTOM_GPT_URL;

  return (
    <header
      id="header-main"
      className="px-4 sm:px-6 pt-3 sm:pt-4 pb-1 flex items-center justify-between relative z-10"
    >
      <div id="brand-logo" className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-orange-500 shadow-lg shadow-orange-200 flex items-center justify-center">
          <Flame className="text-white w-5 h-5" />
        </div>
        <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-orange-400">
          FitAI
        </h1>
      </div>
      <div id="user-stats" className="flex items-center gap-3">
        <motion.div
          id="streak-counter"
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-orange-100/50"
        >
          <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
          <span className="font-bold text-orange-900">{currentStreak}</span>
        </motion.div>
        <button
          id="profile-avatar"
          onClick={() => setActiveTab("profile")}
          className="w-10 h-10 rounded-full border-2 border-orange-500 p-0.5 overflow-hidden shadow-md cursor-pointer hover:scale-105 transition-transform flex items-center justify-center bg-stone-100"
        >
          {profileData.imageUrl ? (
            <img
              src={profileData.imageUrl}
              alt="User"
              className="w-full h-full object-cover rounded-full pointer-events-none"
            />
          ) : (
            <DefaultAvatar />
          )}
        </button>
      </div>
    </header>
  );
}
