import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CalendarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  title?: string;
  minYear?: number;
  maxYear?: number;
}

export const CalendarPickerModal = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  title = "Select Date",
  minYear = 1940,
  maxYear = 2035,
}: CalendarPickerModalProps) => {
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(7); // 1-indexed (1-12)
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Initialize display month/year from selectedDate on open
  useEffect(() => {
    if (selectedDate) {
      const [y, m, d] = selectedDate.split("-").map(Number);
      if (y && m && d) {
        setCurrentYear(y);
        setCurrentMonth(m);
        setSelectedDay(d);
      }
    }
  }, [selectedDate, isOpen]);

  if (!isOpen) return null;

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Helper: Get days in month
  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m, 0).getDate();
  };

  // Helper: Get starting day of week (0-6)
  const getStartDayOfWeek = (y: number, m: number) => {
    return new Date(y, m - 1, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const startDay = getStartDayOfWeek(currentYear, currentMonth);

  // Generate cells grid
  const cells: { dayNum: number; isCurrentMonth: boolean; key: string }[] = [];

  // Previous month filling
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const prevDays = getDaysInMonth(prevYear, prevMonth);
  for (let i = startDay - 1; i >= 0; i--) {
    cells.push({
      dayNum: prevDays - i,
      isCurrentMonth: false,
      key: `prev-${prevDays - i}`,
    });
  }

  // Current month filling
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({
      dayNum: i,
      isCurrentMonth: true,
      key: `curr-${i}`,
    });
  }

  // Next month filling to complete grid of 42 cells (6 rows)
  const remainingCells = 42 - cells.length;
  for (let i = 1; i <= remainingCells; i++) {
    cells.push({
      dayNum: i,
      isCurrentMonth: false,
      key: `next-${i}`,
    });
  }

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      if (currentYear > minYear) {
        setCurrentYear(currentYear - 1);
        setCurrentMonth(12);
      }
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      if (currentYear < maxYear) {
        setCurrentYear(currentYear + 1);
        setCurrentMonth(1);
      }
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDaySelect = (dayNum: number, isCurrentMonth: boolean) => {
    let y = currentYear;
    let m = currentMonth;
    
    if (!isCurrentMonth) {
      // If user clicks a dimmed day from previous/next month, jump there
      const idx = cells.findIndex(c => c.dayNum === dayNum && c.isCurrentMonth === isCurrentMonth);
      if (idx < startDay) {
        // click on previous month cell
        m = currentMonth === 1 ? 12 : currentMonth - 1;
        y = currentMonth === 1 ? currentYear - 1 : currentYear;
      } else {
        // click on next month cell
        m = currentMonth === 12 ? 1 : currentMonth + 1;
        y = currentMonth === 12 ? currentYear + 1 : currentYear;
      }
    }

    const formattedM = String(m).padStart(2, "0");
    const formattedD = String(dayNum).padStart(2, "0");
    const dateStr = `${y}-${formattedM}-${formattedD}`;
    onSelectDate(dateStr);
    onClose();
  };

  // Generate years list
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] flex items-center justify-center p-6 font-sans"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="w-full max-w-[340px] bg-white rounded-[32px] p-5 shadow-2xl border border-black/5 relative space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-stone-150">
            <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest">
              {title}
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-stone-100/85 hover:bg-stone-250 flex items-center justify-center text-stone-505 active:scale-90 transition-transform cursor-pointer border-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Select Controls (Month & Year dropdowns) */}
          <div className="grid grid-cols-2 gap-2">
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(Number(e.target.value))}
              className="bg-stone-50 border border-stone-200/80 rounded-xl px-2 py-1.5 text-xs font-bold text-stone-750 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>

            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(Number(e.target.value))}
              className="bg-stone-50 border border-stone-200/80 rounded-xl px-2 py-1.5 text-xs font-bold text-stone-750 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Month Navigator Row */}
          <div className="flex justify-between items-center px-1">
            <button
              onClick={handlePrevMonth}
              className="w-7 h-7 rounded-lg hover:bg-stone-50 flex items-center justify-center text-stone-500 cursor-pointer active:scale-95 transition-all"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>
            <span className="text-xs font-black uppercase tracking-wider text-stone-700">
              {MONTHS[currentMonth - 1]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="w-7 h-7 rounded-lg hover:bg-stone-50 flex items-center justify-center text-stone-500 cursor-pointer active:scale-95 transition-all"
            >
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Weekday Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAYS_OF_WEEK.map((d) => (
              <span key={d} className="text-[9px] font-black text-stone-400 uppercase select-none">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, idx) => {
              const isSelected = cell.isCurrentMonth && 
                                 selectedDay === cell.dayNum && 
                                 selectedDate.startsWith(`${currentYear}-${String(currentMonth).padStart(2, "0")}`);
              
              return (
                <button
                  key={cell.key}
                  onClick={() => handleDaySelect(cell.dayNum, cell.isCurrentMonth)}
                  className={`aspect-square text-[10px] font-bold rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? "bg-orange-500 text-white font-black shadow-md shadow-orange-500/20"
                      : cell.isCurrentMonth
                        ? "text-stone-700 hover:bg-orange-50 hover:text-orange-655"
                        : "text-stone-300 hover:bg-stone-50"
                  }`}
                >
                  {cell.dayNum}
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
