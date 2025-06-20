import React from 'react';

interface BankingIconProps {
  size?: number;
  className?: string;
}

const BankingIcon: React.FC<BankingIconProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Bank building with columns */}
      <path d="M4 10v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V10" />
      <path d="M12 3L2 9h20L12 3z" />
      {/* Columns */}
      <line x1="6" y1="10" x2="6" y2="20" />
      <line x1="10" y1="10" x2="10" y2="20" />
      <line x1="14" y1="10" x2="14" y2="20" />
      <line x1="18" y1="10" x2="18" y2="20" />
      {/* Steps */}
      <path d="M4 21h16" />
    </svg>
  );
};

export default BankingIcon;
