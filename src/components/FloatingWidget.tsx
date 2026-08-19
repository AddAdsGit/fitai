import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Camera, Mic, Heart, Sparkles, Search, Edit2, Bot } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { ChatGPTIcon } from "./ChatGPTIcon";

export type FloatingActionType =
  | "ai_logger"
  | "quick_log"
  | "detailed_log"
  | "camera"
  | "vitals"
  | "gpt"
  | "voice"
  | "manual";

export interface FloatingWidgetProps {
  isVisible?: boolean;
  actionType?: FloatingActionType | string;
  onExecuteAction: (action: FloatingActionType | string) => void;
}

export const FloatingWidget: React.FC<FloatingWidgetProps> = ({
  isVisible = true,
  actionType = "gpt",
  onExecuteAction,
}) => {
  if (!isVisible) return null;

  const renderIcon = () => {
    switch (actionType) {
      case "ai_logger":
        return <Sparkles className="w-5 h-5 text-white stroke-[2.2]" />;
      case "quick_log":
        return <Search className="w-5 h-5 text-white stroke-[2.2]" />;
      case "detailed_log":
      case "manual":
        return <Edit2 className="w-5 h-5 text-white stroke-[2.2]" />;
      case "camera":
        return <Camera className="w-5 h-5 text-white stroke-[2.2]" />;
      case "vitals":
        return <Heart className="w-5 h-5 text-white fill-white stroke-[2.2]" />;
      case "voice":
        return <Mic className="w-5 h-5 text-white stroke-[2.2]" />;
      case "gpt":
      default:
        return <ChatGPTIcon className="w-5 h-5 text-white" />;
    }
  };

  const getLabel = () => {
    switch (actionType) {
      case "ai_logger":
        return "AI Meal Logger";
      case "quick_log":
        return "Past Foods";
      case "detailed_log":
      case "manual":
        return "Manual Macro Form";
      case "camera":
        return "Direct Camera Capture";
      case "vitals":
        return "Daily Vitals Tracker";
      case "voice":
        return "AI Voice Meal Log";
      case "gpt":
      default:
        return "Open FitAI Custom GPT";
    }
  };

  const widget = (
    <div
      id="floating-widget-viewport-layer"
      className="fixed z-[500] pointer-events-auto right-4 sm:right-auto sm:left-1/2 sm:translate-x-[156px] bottom-[calc(76px+env(safe-area-inset-bottom,12px))] sm:bottom-[88px] w-12 h-12"
    >
      <motion.button
        initial={{ scale: 0, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0, opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => onExecuteAction(actionType)}
        className={cn(
          "w-full h-full rounded-full flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 border border-white/30 cursor-pointer transition-all active:scale-95 select-none ring-2 ring-orange-500/10"
        )}
        title={getLabel()}
      >
        {renderIcon()}
      </motion.button>
    </div>
  );

  return createPortal(widget, document.body);
};
