import { FC } from 'react';

interface ApexLinkLogoProps {
  className?: string;
  size?: number;
}

const ApexLinkLogo: FC<ApexLinkLogoProps> = ({ className, size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer circle with gradient */}
      <circle
        cx="24"
        cy="24"
        r="22"
        fill="url(#gradient1)"
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Inner geometric pattern representing banking/finance */}
      <path
        d="M16 18L24 12L32 18V30L24 36L16 30V18Z"
        fill="white"
        fillOpacity="0.9"
      />
      
      {/* Apex triangle */}
      <path
        d="M24 16L28 22H20L24 16Z"
        fill="currentColor"
      />
      
      {/* Link symbol - interconnected elements */}
      <circle cx="20" cy="26" r="2" fill="currentColor" />
      <circle cx="28" cy="26" r="2" fill="currentColor" />
      <path
        d="M22 26H26"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Banking pillars */}
      <rect x="18" y="28" width="2" height="4" fill="currentColor" />
      <rect x="22" y="28" width="2" height="4" fill="currentColor" />
      <rect x="26" y="28" width="2" height="4" fill="currentColor" />
      <rect x="30" y="28" width="2" height="4" fill="currentColor" />
      
      {/* Base line */}
      <rect x="17" y="32" width="16" height="1" fill="currentColor" />
      
      {/* Gradient definition */}
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default ApexLinkLogo;
