import React from 'react';
import type { RiskLevel } from '../../types';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  showScore?: boolean;
}

const LEVEL_CONFIG = {
  KRITIS: { label: '🔴 KRITIS', className: 'badge-kritis' },
  TINGGI: { label: '🟠 TINGGI', className: 'badge-tinggi' },
  SEDANG: { label: '🟡 SEDANG', className: 'badge-sedang' },
  NORMAL: { label: '🟢 NORMAL', className: 'badge-normal' },
};

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score, showScore }) => {
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.NORMAL;
  return (
    <span className={`badge ${config.className}`}>
      {config.label}
      {showScore && score !== undefined && ` (${score})`}
    </span>
  );
};
