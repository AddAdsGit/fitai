import React from "react";
import { useHoldToAccelerate, HoldToAccelerateOptions } from "../hooks/useHoldToAccelerate";
import { cn } from "../lib/utils";

export interface StepperButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  onStep: () => void;
  options?: HoldToAccelerateOptions;
  children: React.ReactNode;
}

/**
 * High-performance Stepper Button with built-in hold-to-accelerate capability.
 * Supports smooth 1-tap, rapid hold repeating, and turbo speed on sustained hold.
 */
export const StepperButton: React.FC<StepperButtonProps> = ({
  onStep,
  options,
  children,
  className,
  disabled,
  ...props
}) => {
  const handlers = useHoldToAccelerate(onStep, { ...options, disabled });

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "select-none touch-manipulation cursor-pointer active:scale-90 transition-transform",
        className
      )}
      {...handlers}
      {...props}
    >
      {children}
    </button>
  );
};

export default StepperButton;
