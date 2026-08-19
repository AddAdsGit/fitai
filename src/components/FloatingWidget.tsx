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
  const [viewportScale, setViewportScale] = useState(1);

  useEffect(() => {
    // Samsung display zoom reduces the CSS viewport while increasing the
    // physical size of each CSS pixel. Counter-scale this viewport-owned layer.
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

  if (!isVisible) return null;

  const renderIcon = () => {
    switch (actionType) {
      case "ai_logger":
        return <Sparkles className="w-5.5 h-5.5 text-white" />;
      case "quick_log":
        return <Search className="w-5.5 h-5.5 text-white" />;
      case "detailed_log":
      case "manual":
        return <Edit2 className="w-5.5 h-5.5 text-white" />;
      case "camera":
        return <Camera className="w-5.5 h-5.5 text-white" />;
      case "vitals":
        return <Heart className="w-5.5 h-5.5 text-white fill-white" />;
      case "voice":
        return <Mic className="w-5.5 h-5.5 text-white" />;
      case "gpt":
      default:
        return <ChatGPTIcon className="w-5.5 h-5.5 text-white" />;
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
      style={{
        position: "fixed",
        right: `${20 * viewportScale}px`,
        bottom: `${112 * viewportScale}px`,
        width: "48px",
        height: "48px",
        transform: `scale(${viewportScale})`,
        transformOrigin: "bottom right",
        zIndex: 500,
        isolation: "isolate",
      }}
    >
      <motion.button
        initial={{ scale: 0, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0, opacity: 0, y: 20 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onExecuteAction(actionType)}
        className={cn(
          "w-full h-full rounded-full flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 border-none cursor-pointer transition-all active:scale-95 select-none"
        )}
        title={getLabel()}
      >
        {renderIcon()}
      </motion.button>
    </div>
  );

  return createPortal(widget, document.body);
};
