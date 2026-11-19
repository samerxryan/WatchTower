export function WatchTowerLogo({ compact = false, className = '' }) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        className="w-8 h-8 shrink-0"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="wtTowerGrad" x1="16" y1="12" x2="84" y2="88" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
          <linearGradient id="wtBeamGrad" x1="50" y1="30" x2="92" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="10" y="10" width="80" height="80" rx="20" fill="#0F172A" />
        <rect x="10.75" y="10.75" width="78.5" height="78.5" rx="19.25" stroke="#1E293B" strokeWidth="1.5" />
        <path d="M50 31 L84 18 L84 44 Z" fill="url(#wtBeamGrad)" />
        <path d="M50 31 L16 18 L16 44 Z" fill="url(#wtBeamGrad)" transform="rotate(180 50 31)" opacity="0.5" />
        <path d="M36 25 L50 16 L64 25 Z" fill="url(#wtTowerGrad)" />
        <rect x="38" y="27" width="24" height="8" rx="2" fill="#E2E8F0" />
        <circle cx="50" cy="31" r="2.5" fill="#38BDF8" />
        <path d="M41 37 L34 78 H41 L46 37 Z" fill="url(#wtTowerGrad)" />
        <path d="M59 37 L66 78 H59 L54 37 Z" fill="url(#wtTowerGrad)" />
        <rect x="38" y="51" width="24" height="3.5" rx="1.5" fill="#94A3B8" />
        <rect x="35" y="65" width="30" height="3.5" rx="1.5" fill="#94A3B8" />
      </svg>

      {!compact && (
        <span className="text-lg font-bold tracking-tight whitespace-nowrap">
          <span className="text-[#0F172A] dark:text-[#F8FAFC]">Watch</span>
          <span className="font-medium text-[#4F46E5] dark:text-[#818CF8]">Tower</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#38BDF8] ml-0.5 align-baseline" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
