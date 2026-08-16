import React from "react";
import { Calendar as CalendarIcon, Share2 } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

export interface DayItem {
  dayName: string;
  date: number;
  fullDate: string;
}

export interface CalendarStripProps {
  getFormattedSelectedDate: () => string;
  selectedDate: string;
  todayStr: string;
  setSelectedDate: (dateStr: string) => void;
  recenterDaysList: (dateStr: string) => void;
  setIsDatePickerOpen: (open: boolean) => void;
  handleShareDay: () => void;
  daysList: DayItem[];
}

export function CalendarStrip({
  getFormattedSelectedDate,
  selectedDate,
  todayStr,
  setSelectedDate,
  recenterDaysList,
  setIsDatePickerOpen,
  handleShareDay,
  daysList,
}: CalendarStripProps) {
  return (
    <div id="calendar-strip" className="px-4 sm:px-6 mt-3 sm:mt-5 relative z-10 space-y-3">
      {/* Date Selector & Snap-to-Today Header */}
      <div className="flex justify-between items-center px-1 gap-2 min-w-0">
        <span className="text-xs font-black uppercase tracking-widest text-stone-500 truncate min-w-0 font-sans">
          {getFormattedSelectedDate()}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {selectedDate !== todayStr && (
            <button
              onClick={() => {
                setSelectedDate(todayStr);
                recenterDaysList(todayStr);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl shadow-md active:scale-95 transition-all cursor-pointer border-none flex items-center gap-1 shrink-0 font-sans"
            >
              Shift to Today
            </button>
          )}
          <button
            onClick={() => setIsDatePickerOpen(true)}
            className="w-8 h-8 rounded-xl bg-white hover:bg-stone-50 border border-stone-200/60 flex items-center justify-center cursor-pointer shadow-3xs active:scale-95 transition-all border-none"
            title="Choose Date"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-stone-500" />
          </button>
          <button
            onClick={handleShareDay}
            className="w-8 h-8 rounded-xl bg-white hover:bg-stone-50 border border-stone-200/60 flex items-center justify-center cursor-pointer shadow-3xs active:scale-95 transition-all"
            title="Share day summary"
          >
            <Share2 className="w-3.5 h-3.5 text-stone-500" />
          </button>
        </div>
      </div>

      {/* Day Strips */}
      <div className="flex items-center overflow-x-auto pb-2 scrollbar-hide gap-1.5 sm:gap-2 justify-between">
        {daysList.map((day, idx) => {
          const isActive = day.fullDate === selectedDate;
          const d = new Date(day.fullDate + "T00:00:00");
          const shortDayName = d.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
          const shortMonthName = d.toLocaleDateString("en-US", { month: "short" }).toLowerCase();
          return (
            <motion.button
              key={idx}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSelectedDate(day.fullDate);
              }}
              className={cn(
                "flex flex-col items-center justify-center min-w-[42px] sm:min-w-[48px] py-2.5 px-1 rounded-xl transition-all duration-300 shadow-3xs grow cursor-pointer shrink-0 font-sans",
                isActive
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/20 ring-2 ring-orange-100"
                  : "bg-white/70 backdrop-blur-sm text-stone-500 border border-stone-200/60 hover:bg-white",
              )}
            >
              <span className="text-[9px] font-black opacity-60 tracking-tighter uppercase">
                {shortDayName}
              </span>
              <span className="text-base font-black leading-none my-0.5 font-sans">{day.date}</span>
              <span className="text-[8.5px] font-black opacity-60 tracking-wider uppercase">
                {shortMonthName}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
