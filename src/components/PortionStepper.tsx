import React from "react";
import { Minus, Plus } from "lucide-react";
import { StepperButton } from "./StepperButton";
import { cn } from "../lib/utils";

export interface PortionStepperProps {
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
}

export const PortionStepper: React.FC<PortionStepperProps> = ({
  value,
  onChange,
  min = 0.25,
  max = 10,
  step = 0.25,
  label = "Portion Size",
  className,
}) => {
  const handleStep = (delta: number) => {
    const raw = Number((value + delta).toFixed(2));
    const clamped = Math.max(min, Math.min(max, raw));
    onChange(clamped);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    if (valStr === "") {
      onChange(0);
      return;
    }
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleInputBlur = () => {
    if (value <= 0 || isNaN(value)) {
      onChange(1);
    } else {
      const clamped = Math.max(min, Math.min(max, Number(value.toFixed(2))));
      onChange(clamped);
    }
  };

  return (
    <div className={cn("w-full text-left font-sans", className)}>
      {label && (
        <div className="flex items-center justify-between mb-1 px-0.5">
          <label className="text-[8.5px] font-black text-stone-400 uppercase tracking-widest block">
            {label}
          </label>
          <span className="text-[9px] font-black text-orange-600 uppercase tracking-wider">
            {value > 0 ? `${Math.round(value * 100)}% serving` : ""}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between bg-white border border-stone-200/90 focus-within:border-orange-500 rounded-2xl p-1.5 shadow-3xs transition-all w-full">
        <StepperButton
          onStep={() => handleStep(-step)}
          disabled={value <= min}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-90 transition-all border-none bg-transparent"
        >
          <Minus className="w-4 h-4" />
        </StepperButton>

        <div className="flex items-center justify-center gap-0.5">
          <input
            type="number"
            step={step}
            min={min}
            max={max}
            value={value === 0 ? "" : value}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className="bg-transparent border-none text-center text-sm font-black text-stone-900 focus:outline-none w-14 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-xs font-bold text-stone-400 select-none pr-1">x</span>
        </div>

        <StepperButton
          onStep={() => handleStep(step)}
          disabled={value >= max}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-90 transition-all border-none bg-transparent"
        >
          <Plus className="w-4 h-4" />
        </StepperButton>
      </div>
    </div>
  );
};

export default PortionStepper;
