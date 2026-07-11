import React from "react";

export const DefaultAvatar = ({ className = "w-full h-full" }: { className?: string }) => {
  return (
    <div className={`${className} bg-stone-200 rounded-full flex items-center justify-center overflow-hidden`}>
      <svg 
        className="w-3/5 h-3/5 text-stone-400 mt-2" 
        fill="currentColor" 
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
};
