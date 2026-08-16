import React from "react";
import { Plus, Camera, Mic, Heart } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { ChatGPTIcon } from "./ChatGPTIcon";

export type FloatingActionType = "gpt" | "voice" | "camera" | "vitals" | "manual";

export interface FloatingWidgetProps {
  isVisible?: boolean;
  actionType?: FloatingActionType;
  onExecuteAction: (action: FloatingActionType) => void;
}

export const FloatingWidget: React.FC<FloatingWidgetProps> = ({
  isVisible = true,
  actionType = "gpt",
  onExecuteAction,
}) => {
  if (!isVisible) return null;

  const renderIcon = () => {
    switch (actionType) {
      case "voice":
        return <Mic className="w-5.5 h-5.5 text-white" />;
      case "camera":
        return <Camera className="w-5.5 h-5.5 text-white" />;
      case "vitals":
        return <Heart className="w-5.5 h-5.5 text-white fill-white" />;
      case "manual":
        return <Plus className="w-5.5 h-5.5 text-white" />;
      case "gpt":
      default:
        return <ChatGPTIcon className="w-5.5 h-5.5 text-white" />;
    }
  };

  const getLabel = () => {
    switch (actionType) {
      case "voice":
        return "AI Voice Meal Log";
      case "camera":
        return "AI Photo Meal Log";
      case "vitals":
        return "Daily Vitals Tracker";
      case "manual":
        return "Quick Meal Log";
      case "gpt":
      default:
        return "Open FitAI Custom GPT";
    }
  };

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0, y: 20 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onExecuteAction(actionType)}
      className={cn(
        "fixed bottom-28 right-5 sm:right-[calc(50%-210px)] w-12 h-12 rounded-full flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 z-40 border-none cursor-pointer transition-all active:scale-95 select-none"
      )}
      title={getLabel()}
    >
      {renderIcon()}
    </motion.button>
  );
};


