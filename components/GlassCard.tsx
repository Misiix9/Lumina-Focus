
import React from 'react';
import { MonoCardProps } from '../types';
import { ACCENT_COLORS } from '../constants';

export const MonoCard: React.FC<MonoCardProps> = ({ children, className = '', style, onClick, noPadding = false, accent = 'monochrome' }) => {
  
  const borderColor = accent === 'monochrome' ? 'var(--accent-color)' : ACCENT_COLORS[accent];
  
  return (
    <div 
      onClick={onClick}
      style={{
        ...style,
        borderColor: 'transparent', // Base
        '--card-accent': borderColor
      } as React.CSSProperties}
      className={`
      bg-white dark:bg-[#0A0A0A]
      border border-gray-200 dark:border-[#222]
      rounded-xl
      transition-all duration-300 ease-out
      hover:border-[var(--card-accent)]
      hover:shadow-[0_0_15px_var(--card-accent)] dark:hover:shadow-[0_0_10px_var(--card-accent)]
      relative overflow-hidden
      ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''}
      ${noPadding ? '' : 'p-6'}
      ${className}
    `}>
      {children}
    </div>
  );
};
