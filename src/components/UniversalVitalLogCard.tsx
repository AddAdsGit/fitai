import React from "react";
import { Scale, Droplet, Zap, X } from "lucide-react";
import { BristolStoolIcon, BloatingIcon, BloatingStomachIcon } from "./BristolStoolIcons";
import { cn } from "../lib/utils";

const formatInterestingTime = (timeStr?: string | null) => {
  if (!timeStr) return null;
  if (!timeStr.includes(":")) return timeStr;
  const [hStr, mStr] = timeStr.split(":");
  if (!hStr || !mStr) return timeStr;
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${mStr} ${ampm}`;
};

export interface UniversalVitalLogCardProps {
  type: "weight" | "water" | "digestion" | "energy" | "bloating";
  valueText: string;
  subText?: string; // e.g. "(Type 4)" or "(Level 4)" or "Average Weight: 70.2 kg • avg from 5 logged days"
  stoolType?: number | null;
  bloatingLevel?: number | null;
  logTime?: string | null;
  onDelete?: () => void;
  canDelete?: boolean;
  className?: string;
}

export const UniversalVitalLogCard: React.FC<UniversalVitalLogCardProps> = ({
  type,
  valueText,
  subText,
  stoolType,
  bloatingLevel,
  logTime,
  onDelete,
  canDelete = true,
  className,
}) => {
  const IconComp = (() => {
    if (type === "weight") return Scale;
    if (type === "water") return Droplet;
    if (type === "energy") return Zap;
    if (type === "bloating") return BloatingIcon;
    return null;
  })();

  const isAverageSubtext = subText?.startsWith("Average");

  return (
    <div
      className={cn(
        "bg-white border border-stone-200/80 rounded-2xl px-3.5 py-2.5 min-h-[44px] shadow-3xs hover:shadow-2xs transition-all flex items-center justify-between gap-3 select-none",
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-[10px] bg-orange-50/80 border border-orange-100/60 flex items-center justify-center text-orange-500 shrink-0 shadow-3xs">
          {type === "digestion" && stoolType ? (
            <BristolStoolIcon type={stoolType} className="w-4.5 h-4.5" />
          ) : type === "bloating" && bloatingLevel ? (
            <BloatingStomachIcon level={bloatingLevel} className="w-4.5 h-4.5" />
          ) : IconComp ? (
            <IconComp className="w-4 h-4" />
          ) : (
            <Scale className="w-4 h-4" />
          )}
        </div>
        <div className="min-w-0 text-left">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[13px] font-black text-orange-950 font-mono leading-none">
              {valueText}
            </span>
            {subText && !isAverageSubtext && (
              <span className="text-[11px] font-bold text-stone-500 font-mono">
                {subText}
              </span>
            )}
            {logTime && (
              <span className="text-[10.5px] font-semibold text-stone-400 font-sans tracking-wide">
                at {formatInterestingTime(logTime)}
              </span>
            )}
          </div>
          {subText && isAverageSubtext && (
            <p className="text-[9.5px] font-bold text-orange-900/60 mt-0.5 truncate">
              {subText}
            </p>
          )}
        </div>
      </div>
      {canDelete && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="w-6.5 h-6.5 rounded-[10px] hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center cursor-pointer transition-colors border-none shrink-0"
          title="Remove entry"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
