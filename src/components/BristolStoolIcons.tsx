import React from "react";

interface BristolStoolIconProps {
  type: number; // 1 to 7
  className?: string;
}

export const BristolStoolIcon: React.FC<BristolStoolIconProps> = ({ type, className = "w-7 h-7" }) => {
  switch (type) {
    case 1:
      // Type 1: Separate hard lumps, like nuts (Hard brown pebbles)
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <circle cx="14" cy="24" r="6" fill="#78350F" />
          <circle cx="28" cy="16" r="7" fill="#92400E" />
          <circle cx="34" cy="30" r="5.5" fill="#78350F" />
          <circle cx="20" cy="32" r="5" fill="#92400E" />
          <circle cx="12" cy="22" r="1.5" fill="#FDE68A" opacity="0.4" />
          <circle cx="26" cy="14" r="2" fill="#FDE68A" opacity="0.4" />
        </svg>
      );

    case 2:
      // Type 2: Sausage-shaped, but lumpy (Warm brown)
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <path
            d="M8 24C8 18 13 14 19 15C21 13 25 13 28 15C31 13 36 14 39 18C42 22 41 28 37 31C33 33 28 32 25 30C22 32 17 33 13 31C9 29 8 26 8 24Z"
            fill="#8D5B4C"
          />
          <circle cx="14" cy="22" r="4" fill="#78350F" opacity="0.5" />
          <circle cx="24" cy="21" r="5" fill="#78350F" opacity="0.5" />
          <circle cx="33" cy="23" r="4.5" fill="#78350F" opacity="0.5" />
          <path d="M12 20C12 18 16 16 20 17" stroke="#FDE68A" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        </svg>
      );

    case 3:
      // Type 3: Like a sausage but with cracks on its surface (Amber brown)
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <rect x="8" y="17" width="32" height="14" rx="7" fill="#A16207" />
          <path d="M16 18L18 24L15 28" stroke="#451A03" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M25 17L27 22L24 30" stroke="#451A03" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M33 19L31 25L34 29" stroke="#451A03" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="12" y="19" width="24" height="2" rx="1" fill="#FEF3C7" opacity="0.4" />
        </svg>
      );

    case 4:
      // Type 4: Like a sausage or snake, smooth and soft (Chocolate brown)
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <path
            d="M8 26C8 20 14 16 20 18C26 20 32 16 38 18C42 19.5 43 25 39 28C33 32 27 27 21 27C15 27 10 30 8 26Z"
            fill="#7C2D12"
          />
          <path
            d="M11 23C13 19 18 18 22 20C28 22 33 18 37 19"
            stroke="#FED7AA"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M10 27C12 29 16 28 20 26"
            stroke="#451A03"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      );

    case 5:
      // Type 5: Soft blobs with clear-cut edges (Soft brown blobs)
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <path d="M15 22C15 17 21 16 21 21C21 25 15 26 15 22Z" fill="#92400E" />
          <path d="M27 17C27 12 34 12 34 17C34 22 27 21 27 17Z" fill="#78350F" />
          <path d="M20 32C20 26 28 25 28 30C28 35 20 35 20 32Z" fill="#B45309" />
          <circle cx="17" cy="19" r="1.5" fill="#FEF3C7" opacity="0.6" />
          <circle cx="29" cy="15" r="1.5" fill="#FEF3C7" opacity="0.6" />
        </svg>
      );

    case 6:
      // Type 6: Fluffy pieces with ragged edges, a mushy stool (Light brown mush)
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <path
            d="M10 26C8 22 11 18 15 19C17 15 22 15 25 18C28 15 34 16 36 20C40 21 41 26 38 29C36 32 31 32 28 30C25 33 19 33 16 30C12 31 9 29 10 26Z"
            fill="#B45309"
          />
          <circle cx="16" cy="22" r="3" fill="#78350F" opacity="0.4" />
          <circle cx="27" cy="23" r="4" fill="#78350F" opacity="0.4" />
        </svg>
      );

    case 7:
      // Type 7: Watery, no solid pieces. Entirely Liquid (Liquid brown splash)
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <path
            d="M8 28C12 24 16 30 20 28C24 26 28 30 32 28C36 26 40 30 42 28V34C42 37 39 40 36 40H12C9 40 8 37 8 34V28Z"
            fill="#78350F"
          />
          <path
            d="M14 18C14 18 16 13 18 13C20 13 22 18 22 18C22 20 14 20 14 18Z"
            fill="#B45309"
          />
          <path
            d="M28 15C28 15 30 11 31 11C32 11 34 15 34 15C34 17 28 17 28 15Z"
            fill="#D97706"
          />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <circle cx="24" cy="24" r="16" fill="#78350F" />
        </svg>
      );
  }
};

export const GutIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2a4 4 0 0 0-4 4v3.5a1.5 1.5 0 0 1-1.5 1.5H5.5A2.5 2.5 0 0 0 3 13.5v1A3.5 3.5 0 0 0 6.5 18h.5a2 2 0 0 1 2 2v.5a1.5 1.5 0 0 0 3 0V19a2 2 0 0 1 2-2h1a3 3 0 0 0 3-3v-1.5A2.5 2.5 0 0 0 15.5 10H14a1.5 1.5 0 0 1-1.5-1.5V6a4 4 0 0 0-4-4z" />
  </svg>
);

export const GreyPoopIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 3c-.8 0-1.5.5-1.8 1.2-.4.9.1 2 .9 2.5.9.5.9 1.8 0 2.3-.8.5-1.3 1.6-.9 2.5.4.9 1.5 1.4 2.5 1.1 1.2-.4 2.3.5 2.3 1.7 0 1.2-1 2.2-2.2 2.2H8.5C6.6 16.5 5 18.1 5 20c0 .6.4 1 1 1h12c1.7 0 3-1.3 3-3 0-1.5-1.1-2.7-2.5-2.9 1-.5 1.7-1.5 1.7-2.6 0-1.6-1.2-2.9-2.8-3-.3-.9-1.2-1.5-2.2-1.3-.2-1.1-.9-2-1.9-2.4-.4-.2-.8-.7-.8-1.3 0-1.4-1.1-2.5-2.5-2.5z" />
  </svg>
);

export const BloatingIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 5c0 0 6-2 10 2s2 10-2 12-9 0-9-5c0-4 1-9 1-9Z" />
    <path d="M11 9c2 0 4 2 4 4" strokeWidth="1.5" opacity="0.6" />
  </svg>
);

export const BloatingStomachIcon: React.FC<{ level: number; className?: string }> = ({ level, className = "w-7 h-7" }) => {
  switch (level) {
    case 1:
      // Level 1: Calm Stomach Organ (Emerald — healthy, flat, checkmark)
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <circle cx="24" cy="24" r="22" fill="#E5F7EE" />
          <g transform="translate(24 24) scale(0.21)">
            <path
              d="M-15 -43 C-15 -29 -4 -25 -4 -9 C-4 5 -13 15 -28 17 C-42 19 -48 29 -42 38 C-35 49 -17 51 -2 45 C18 37 30 22 30 3 C30 -17 18 -32 4 -35 C-5 -37 -8 -43 -8 -51 Z"
              fill="#F5A6A1"
              stroke="#172033"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M34 -8L40 0L52 -16" stroke="#059669" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      );

    case 2:
      // Level 2: Mild Bloated Stomach Organ (Amber — slight swell + 2 gas bubbles)
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <circle cx="24" cy="24" r="22" fill="#FFF3CC" />
          <g transform="translate(24 24) scale(0.23)">
            <path
              d="M-15 -43 C-15 -29 -4 -25 -4 -9 C-4 7 -14 18 -31 20 C-47 22 -53 33 -46 43 C-38 55 -18 56 0 49 C21 41 35 24 35 3 C35 -19 22 -34 6 -38 C-3 -40 -8 -44 -8 -51 Z"
              fill="#F5A6A1"
              stroke="#172033"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="8" cy="18" r="6" fill="#FFFFFF" fillOpacity="0.85" />
            <circle cx="20" cy="4" r="4" fill="#FFFFFF" fillOpacity="0.85" />
          </g>
        </svg>
      );

    case 3:
      // Level 3: Moderate Bloated Stomach Organ (Orange — noticeable swell + 3 gas bubbles)
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <circle cx="24" cy="24" r="22" fill="#FFE4CF" />
          <g transform="translate(24 24) scale(0.25)">
            <path
              d="M-15 -43 C-15 -29 -4 -25 -4 -9 C-4 10 -15 22 -34 25 C-51 27 -58 39 -50 50 C-41 62 -18 62 2 54 C26 45 41 26 41 3 C41 -22 25 -38 8 -42 C-2 -44 -8 -47 -8 -53 Z"
              fill="#F5A6A1"
              stroke="#172033"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="4" cy="25" r="8" fill="#FFFFFF" fillOpacity="0.9" />
            <circle cx="21" cy="9" r="6" fill="#FFFFFF" fillOpacity="0.9" />
            <circle cx="28" cy="-9" r="4" fill="#FFFFFF" fillOpacity="0.9" />
          </g>
        </svg>
      );

    case 4:
    default:
      // Level 4: Severe Bloated Stomach Organ (Red — full bloat + 4 large gas bubbles)
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <circle cx="24" cy="24" r="22" fill="#FFDDE1" />
          <g transform="translate(24 24) scale(0.27)">
            <path
              d="M-15 -43 C-15 -29 -4 -25 -4 -9 C-4 13 -16 26 -37 29 C-55 31 -63 44 -54 56 C-44 69 -19 68 4 59 C30 49 47 28 47 3 C47 -24 29 -42 10 -46 C-1 -48 -8 -51 -8 -57 Z"
              fill="#F5A6A1"
              stroke="#172033"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="-1" cy="29" r="9" fill="#FFFFFF" fillOpacity="0.9" />
            <circle cx="18" cy="13" r="7" fill="#FFFFFF" fillOpacity="0.9" />
            <circle cx="30" cy="-7" r="5" fill="#FFFFFF" fillOpacity="0.9" />
            <circle cx="9" cy="-10" r="4" fill="#FFFFFF" fillOpacity="0.9" />
          </g>
        </svg>
      );
  }
};
