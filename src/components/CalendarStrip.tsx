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
    <div id="calendar-strip" className="px-4 sm:px-6 mt-2 sm:mt-2.5 relative z-10 space-y-2 font-sans">
      {/* Date Selector & Snap-to-Today Header */}
      <div className="flex justify-between items-center px-1 gap-2 min-w-0">
        <span className="text-xs font-black uppercase tracking-widest text-stone-500 truncate min-w-0">
          {getFormattedSelectedDate()}
        </span>
        <div className="flex items-center gap-2">
          {selectedDate !== todayStr && (
            <button
              onClick={() => {
                setSelectedDate(todayStr);
                recenterDaysList(todayStr);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-md active:scale-95 transition-all cursor-pointer border-none flex items-center gap-1 shrink-0"
            >
              Shift to Today
            </button>
          )}
          <button
            onClick={() => setIsDatePickerOpen(true)}
            className="w-8 h-8 rounded-xl bg-white hover:bg-stone-50 border border-stone-200/60 flex items-center justify-center cursor-pointer shadow-sm active:scale-95 transition-all border-none"
            title="Choose Date"
          >
            <CalendarIcon className="w-4 h-4 text-stone-500" />
          </button>
          <button
            onClick={handleShareDay}
            className="w-8 h-8 rounded-xl bg-white hover:bg-stone-50 border border-stone-200/60 flex items-center justify-center cursor-pointer shadow-sm active:scale-95 transition-all"
            title="Share day summary"
          >
            <Share2 className="w-4 h-4 text-stone-500" />
          </button>
        </div>
      </div>

      {/* Day Strips */}
      <div className="flex justify-between items-center overflow-x-auto pb-4 scrollbar-hide gap-3">
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
                "flex flex-col items-center justify-center min-w-[58px] py-3.5 rounded-2xl transition-all duration-300 shadow-sm grow cursor-pointer shrink-0",
                isActive
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-200 ring-4 ring-orange-50"
                  : "bg-white/60 backdrop-blur-sm text-gray-500 border border-orange-50/50 hover:bg-white/90",
              )}
            >
              <span className="text-[10px] font-black opacity-60 tracking-tighter">
                {shortDayName}
              </span>
              <span className="text-lg font-black leading-none my-1">{day.date}</span>
              <span className="text-[9px] font-black opacity-60 tracking-wider">
                {shortMonthName}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
