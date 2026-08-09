import React, { useState, useEffect, useRef } from "react";
import { cn } from "../lib/utils";
import { DailyWellness } from "../types";

export interface WellnessJournalProps {
  selectedDate: string;
  dailyNotes: DailyWellness[];
  handleSaveDailyNote: (dateStr: string, text: string) => Promise<void>;
  todayStr: string;
  dailyTagHits: Record<string, number>;
  trackingTags: any[];
}

export function WellnessJournal({
  selectedDate,
  dailyNotes,
  handleSaveDailyNote,
  todayStr,
  dailyTagHits,
  trackingTags,
}: WellnessJournalProps) {
  const stripMetaComment = (text: string) => {
    return (text || "")
      .replace(/\s*<!-- FIT_WELLNESS_META: [\s\S]*? -->/g, "")
      .replace(/\n*--- Wellness Logs ---[\s\S]*$/, "")
      .trim();
  };

  const activeNoteObj = dailyNotes.find((n) => n.date === selectedDate);
  const rawNoteText = activeNoteObj ? activeNoteObj.notes : "";
  const cleanActiveNoteText = stripMetaComment(rawNoteText);

  const [isEditingNote, setIsEditingNote] = useState(false);
  const [draftNote, setDraftNote] = useState(cleanActiveNoteText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  // Sync draft when database value or selected date changes
  useEffect(() => {
    setDraftNote(cleanActiveNoteText);
  }, [cleanActiveNoteText, selectedDate]);

  // Debounced auto-save effect
  const triggerAutoSave = (newVal: string) => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      handleSaveDailyNote(selectedDate, newVal);
    }, 1000);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDraftNote(val);
    triggerAutoSave(val);
  };

  const handleBlur = () => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    handleSaveDailyNote(selectedDate, draftNote);
    setIsEditingNote(false);
  };

  // Auto focus when entering edit mode
  useEffect(() => {
    if (isEditingNote && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditingNote]);

  const isReadOnly = selectedDate !== todayStr;
  const cleanNoteText = cleanActiveNoteText;

  return (
    <div className="flex flex-col gap-3 text-left w-full relative select-none">
      <div className="w-full min-h-[90px] flex flex-col justify-start">
        {isEditingNote && !isReadOnly ? (
          <textarea
            ref={textareaRef}
            value={draftNote}
            onChange={handleTextareaChange}
            onBlur={handleBlur}
            placeholder="Tap here to write down how you felt, symptoms, food reactions, or notes about today..."
            className="w-full bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none p-0 text-sm font-semibold text-stone-800 placeholder-stone-400 resize-none min-h-[90px] leading-relaxed transition-all"
          />
        ) : (
          <div
            onClick={() => {
              if (!isReadOnly) setIsEditingNote(true);
            }}
            className={cn(
              "text-sm leading-relaxed min-h-[90px] py-0.5 transition-colors duration-200 select-text whitespace-pre-line",
              !isReadOnly ? "cursor-text" : "cursor-default",
              cleanNoteText
                ? "font-semibold text-stone-800"
                : "font-medium text-stone-400 italic"
            )}
          >
            {cleanNoteText ||
              (isReadOnly
                ? "No notes recorded for this date."
                : "Tap here to write down how you felt, symptoms, food reactions, or notes about today...")}
          </div>
        )}
      </div>
    </div>
  );
}
