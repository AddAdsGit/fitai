import React, { useRef, useCallback, useEffect } from "react";

export interface HoldToAccelerateOptions {
  initialDelayMs?: number; // Time before repeat starts (default: 300ms)
  initialIntervalMs?: number; // Normal repeating speed (default: 130ms)
  acceleratedIntervalMs?: number; // 2nd stage speed (default: 50ms)
  turboIntervalMs?: number; // 3rd stage turbo speed (default: 20ms)
  disabled?: boolean;
}

/**
 * Custom hook providing hold-to-accelerate functionality for stepper (+/-) buttons.
 * Works seamlessly with mobile touch, desktop mouse, and keyboard interactions.
 */
export function useHoldToAccelerate(
  callback: () => void,
  options: HoldToAccelerateOptions = {}
) {
  const {
    initialDelayMs = 300,
    initialIntervalMs = 130,
    acceleratedIntervalMs = 50,
    turboIntervalMs = 20,
    disabled = false,
  } = options;

  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const timeoutRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const isHoldingRef = useRef<boolean>(false);
  const hasTriggeredOnDownRef = useRef<boolean>(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    isHoldingRef.current = false;
  }, []);

  const scheduleNextTick = useCallback(() => {
    if (!isHoldingRef.current) return;

    const elapsed = Date.now() - startTimeRef.current;
    let currentInterval = initialIntervalMs;

    if (elapsed > 3000) {
      currentInterval = turboIntervalMs;
    } else if (elapsed > 1200) {
      currentInterval = acceleratedIntervalMs;
    }

    intervalRef.current = setTimeout(() => {
      if (isHoldingRef.current) {
        callbackRef.current();
        scheduleNextTick();
      }
    }, currentInterval);
  }, [initialIntervalMs, acceleratedIntervalMs, turboIntervalMs]);

  const startHolding = useCallback(() => {
    if (disabled) return;
    clearTimers();
    isHoldingRef.current = true;
    startTimeRef.current = Date.now();
    hasTriggeredOnDownRef.current = true;

    // 1. Fire immediately on press
    callbackRef.current();

    // 2. Start repeating after initial delay
    timeoutRef.current = setTimeout(() => {
      if (isHoldingRef.current) {
        callbackRef.current();
        scheduleNextTick();
      }
    }, initialDelayMs);
  }, [disabled, clearTimers, initialDelayMs, scheduleNextTick]);

  const stopHolding = useCallback(() => {
    clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return; // Primary button only for mouse
      startHolding();
    },
    onPointerUp: () => stopHolding(),
    onPointerLeave: () => stopHolding(),
    onPointerCancel: () => stopHolding(),
    onContextMenu: (e: React.MouseEvent) => {
      // Prevent long-press context menu on mobile
      if (isHoldingRef.current) {
        e.preventDefault();
      }
    },
    onClick: (e: React.MouseEvent) => {
      // If pointerdown already handled the action, suppress the synthetic click
      if (hasTriggeredOnDownRef.current) {
        hasTriggeredOnDownRef.current = false;
        e.preventDefault();
        return;
      }
      if (!disabled) {
        callbackRef.current();
      }
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !isHoldingRef.current) {
        startHolding();
      }
    },
    onKeyUp: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        stopHolding();
      }
    },
  };
}

export default useHoldToAccelerate;
