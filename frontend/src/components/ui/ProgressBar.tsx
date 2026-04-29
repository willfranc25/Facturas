import React from 'react';

export interface ProgressBarProps {
  className?: string;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ className = '', label }) => {
  return (
    <div className={`w-full ${className}`} role="progressbar" aria-label={label || 'Cargando'}>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 animate-progress"
          style={{
            animation: 'progress 1.5s ease-in-out infinite',
          }}
        />
      </div>
      {label && (
        <p className="mt-2 text-sm text-gray-600 text-center">{label}</p>
      )}
      <style>{`
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-progress {
          width: 50%;
        }
      `}</style>
    </div>
  );
};
