import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textClassName?: string;
  subtitleClassName?: string;
}

export function AppLogo({
  className = '',
  size = 'md',
  showText = true,
  textClassName = 'text-gray-900',
  subtitleClassName = 'text-gray-500',
}: AppLogoProps) {
  const iconSizes = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-11 w-11',
    xl: 'h-14 w-14',
  };

  const titleSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className={`relative flex-shrink-0 ${iconSizes[size]}`}>
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="logo-grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#logo-grad-primary)" />
          <path d="M20 22L32 15L44 22L32 29L20 22Z" fill="#ffffff" fillOpacity="0.95" />
          <path d="M20 31L32 24L44 31L32 38L20 31Z" fill="#ffffff" fillOpacity="0.75" />
          <path d="M20 40L32 33L44 40L32 47L20 40Z" fill="#ffffff" fillOpacity="0.55" />
          <circle cx="32" cy="22" r="3.5" fill="#38bdf8" />
          <circle cx="32" cy="22" r="1.5" fill="#ffffff" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-black tracking-tight leading-none ${titleSizes[size]} ${textClassName}`}>
            Dataset<span className="text-indigo-600">Desk</span>
          </span>
          <span className={`text-[10px] tracking-widest font-semibold uppercase leading-tight mt-0.5 ${subtitleClassName}`}>
            Robotics Teleoperation Platform
          </span>
        </div>
      )}
    </div>
  );
}
