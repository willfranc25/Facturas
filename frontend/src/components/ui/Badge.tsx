import React from 'react';
import type { InvoiceStatus } from '../../types/invoice';

export interface BadgeProps {
  status: InvoiceStatus;
  className?: string;
}

const statusConfig: Record<InvoiceStatus, { label: string; colorClasses: string }> = {
  pending: {
    label: 'Pendiente',
    colorClasses: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  reviewed: {
    label: 'Revisado',
    colorClasses: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  approved: {
    label: 'Aprobado',
    colorClasses: 'bg-green-100 text-green-800 border-green-200',
  },
};

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const config = statusConfig[status];

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
        ${config.colorClasses}
        ${className}
      `}
      role="status"
      aria-label={`Estado: ${config.label}`}
    >
      {config.label}
    </span>
  );
};
