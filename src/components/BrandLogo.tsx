import React from "react";
import { BRAND_FLAME_SVG_PATH, BRAND_NAME } from "../constants/brand";

export type LogoVariant = 
  | "icon" 
  | "boxed" 
  | "lockup" 
  | "ghost" 
  | "dark_boxed" 
  | "dark_lockup" 
  | "white_boxed" 
  | "white_lockup";

interface BrandLogoProps extends React.SVGProps<SVGSVGElement> {
  variant?: LogoVariant;
  className?: string;
  size?: number;
  boxSize?: string;
  textColor?: string;
}

/**
 * FitAI Canonical Brand Logo System (Single Source of Truth)
 * Supports official brand variations while strictly maintaining 100% vector shape consistency.
 * 
 * Variants:
 * - "icon"         : Pure vector flame (customizable size, color, fill)
 * - "boxed"        : Signature rounded orange square container with crisp white flame inside
 * - "lockup"       : Signature orange box + bold "FitAI" wordmark
 * - "dark_boxed"   : Premium dark obsidian square with vibrant orange flame
 * - "dark_lockup"  : Dark obsidian square + white "FitAI" wordmark
 * - "white_boxed"  : Crisp white square with vibrant orange flame
 * - "white_lockup" : Crisp white square with white "FitAI" wordmark
 * - "ghost"        : Translucent outline version
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "icon",
  className = "w-5 h-5",
  size = 20,
  boxSize = "w-9 h-9",
  textColor = "text-orange-950",
  ...props
}) => {
  // 1. Signature Orange Box (Light Theme Default)
  if (variant === "boxed") {
    return (
      <div className={`rounded-xl bg-orange-500 shadow-lg shadow-orange-200 flex items-center justify-center shrink-0 ${boxSize}`}>
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="#FFFFFF"
          className="text-white fill-white"
          xmlns="http://www.w3.org/2000/svg"
          {...props}
        >
          <path d={BRAND_FLAME_SVG_PATH} />
        </svg>
      </div>
    );
  }

  // 2. Signature Orange Lockup (Light Theme Default)
  if (variant === "lockup") {
    return (
      <div className="flex items-center gap-2 select-none">
        <div className={`rounded-xl bg-orange-500 shadow-lg shadow-orange-200 flex items-center justify-center shrink-0 ${boxSize}`}>
          <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="#FFFFFF"
            className="text-white fill-white"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
          >
            <path d={BRAND_FLAME_SVG_PATH} />
          </svg>
        </div>
        <span className={`text-2xl font-black tracking-tight ${textColor}`}>
          {BRAND_NAME}
        </span>
      </div>
    );
  }

  // 3. Dark Boxed (Obsidian badge with Vibrant Orange Flame)
  if (variant === "dark_boxed") {
    return (
      <div className={`rounded-xl bg-zinc-900 border border-white/10 shadow-lg shadow-black/40 flex items-center justify-center shrink-0 ${boxSize}`}>
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="#F97316"
          className="text-[#F97316] fill-[#F97316]"
          xmlns="http://www.w3.org/2000/svg"
          {...props}
        >
          <path d={BRAND_FLAME_SVG_PATH} />
        </svg>
      </div>
    );
  }

  // 4. Dark Lockup (Obsidian badge + White Wordmark)
  if (variant === "dark_lockup") {
    return (
      <div className="flex items-center gap-2 select-none">
        <div className={`rounded-xl bg-zinc-900 border border-white/10 shadow-lg shadow-black/40 flex items-center justify-center shrink-0 ${boxSize}`}>
          <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="#F97316"
            className="text-[#F97316] fill-[#F97316]"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
          >
            <path d={BRAND_FLAME_SVG_PATH} />
          </svg>
        </div>
        <span className="text-2xl font-black tracking-tight text-white">
          {BRAND_NAME}
        </span>
      </div>
    );
  }

  // 5. White Boxed (Crisp White badge with Orange Flame)
  if (variant === "white_boxed") {
    return (
      <div className={`rounded-xl bg-white shadow-md flex items-center justify-center shrink-0 ${boxSize}`}>
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="#FF5D02"
          className="text-[#FF5D02] fill-[#FF5D02]"
          xmlns="http://www.w3.org/2000/svg"
          {...props}
        >
          <path d={BRAND_FLAME_SVG_PATH} />
        </svg>
      </div>
    );
  }

  // 6. White Lockup (White badge + White Wordmark)
  if (variant === "white_lockup") {
    return (
      <div className="flex items-center gap-2 select-none">
        <div className={`rounded-xl bg-white shadow-md flex items-center justify-center shrink-0 ${boxSize}`}>
          <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="#FF5D02"
            className="text-[#FF5D02] fill-[#FF5D02]"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
          >
            <path d={BRAND_FLAME_SVG_PATH} />
          </svg>
        </div>
        <span className="text-xl font-black tracking-tight text-white">
          {BRAND_NAME}
        </span>
      </div>
    );
  }

  // 7. Mono White (Crisp Pure-White badge with Black Flame + White Wordmark)
  if (variant === "mono_white") {
    return (
      <div className="flex items-center gap-2 select-none">
        <div className={`rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 ${boxSize}`}>
          <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="#000000"
            className="text-black fill-black"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
          >
            <path d={BRAND_FLAME_SVG_PATH} />
          </svg>
        </div>
        <span className="text-xl font-black tracking-tight text-white">
          {BRAND_NAME}
        </span>
      </div>
    );
  }

  // 8. Mono Dark (Black badge with White Flame + White Wordmark)
  if (variant === "mono_dark") {
    return (
      <div className="flex items-center gap-2 select-none">
        <div className={`rounded-xl bg-black border border-white/20 shadow-md flex items-center justify-center shrink-0 ${boxSize}`}>
          <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="#FFFFFF"
            className="text-white fill-white"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
          >
            <path d={BRAND_FLAME_SVG_PATH} />
          </svg>
        </div>
        <span className="text-xl font-black tracking-tight text-white">
          {BRAND_NAME}
        </span>
      </div>
    );
  }

  // 7. Pure Icon Fallback
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d={BRAND_FLAME_SVG_PATH} />
    </svg>
  );
};
