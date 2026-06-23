interface IconProps {
  className?: string;
}

/** Growth — expanding concentric diamonds */
export const GrowthIcon = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2L22 12L12 22L2 12Z" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    <path d="M12 6L18 12L12 18L6 12Z" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <path d="M12 9L15 12L12 15L9 12Z" fill="currentColor" opacity="0.7" />
  </svg>
);

/** Flame-like intensity — stacked triangles */
export const IntensityIcon = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 3L18 15H6Z" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    <path d="M12 7L16 15H8Z" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <path d="M12 10L14.5 15H9.5Z" fill="currentColor" opacity="0.7" />
  </svg>
);

/** Stories — overlapping pages */
export const StoriesIcon = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="5" y="3" width="12" height="16" rx="1" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    <rect x="7" y="5" width="12" height="16" rx="1" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <rect x="9" y="7" width="12" height="16" rx="1" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1" strokeOpacity="0.7" />
  </svg>
);

/** Time — concentric arcs like a sundial */
export const TimeIcon = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 5A7 7 0 0 1 19 12" stroke="currentColor" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
    <path d="M12 7A5 5 0 0 1 17 12" stroke="currentColor" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
    <path d="M12 9A3 3 0 0 1 15 12" stroke="currentColor" strokeWidth="1.5" opacity="0.7" strokeLinecap="round" />
    <circle cx="12" cy="12" r="1" fill="currentColor" opacity="0.8" />
  </svg>
);
