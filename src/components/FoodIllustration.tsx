import React from "react";

export const FoodIllustration = ({ className = "w-12 h-12 text-orange-500" }: { className?: string }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Plate (shifted slightly left to make room for tumbler) */}
    <circle cx="26" cy="36" r="13" strokeWidth="2.5" />
    <circle cx="26" cy="36" r="8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
    
    {/* Fork (Left of Plate) */}
    <path d="M8 24v10m0 0v10M5 24v5M11 24v5M5 29h6" />
    
    {/* Spoon (Right of Plate) */}
    <path d="M42 24c0 3.5-2.5 5-2.5 5s-2.5-1.5-2.5-5 1.25-4.5 2.5-4.5 2.5 1 2.5 4.5zm-2.5 5v15" />
    
    {/* Tumbler glass with Steel Straw */}
    <path d="M50 20h10l-1.5 16h-7L50 20z" strokeWidth="2" />
    <path d="M53.5 20l3.5-12" strokeWidth="2" /> {/* Steel Straw */}
  </svg>
);
