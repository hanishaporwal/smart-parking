import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'motion/react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'pills' | 'underline';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeId,
  onChange,
  variant = 'pills',
  className,
}) => {
  return (
    <div
      role="tablist"
      className={twMerge(
        clsx(
          'flex items-center gap-1.5 p-1',
          variant === 'pills' && 'glass-recessed rounded-pill',
          variant === 'underline' && 'border-b border-border-1 pb-0 gap-4',
          className,
        ),
      )}
    >
      {tabs.map(tab => {
        const isActive = tab.id === activeId;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'flex items-center gap-2 font-medium text-xs sm:text-sm transition-all duration-200 select-none relative focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-[0.96]',
              variant === 'pills' && [
                'px-4 py-1.5 rounded-pill relative z-[1]',
                isActive
                  ? 'text-gold font-semibold'
                  : 'text-text-2 hover:text-text',
              ],
              variant === 'underline' && [
                'py-2 px-1 border-b-2 font-medium',
                isActive
                  ? 'border-gold text-gold font-semibold'
                  : 'border-transparent text-text-2 hover:text-text hover:border-border-2',
              ],
            )}
          >
            {/* Liquid sliding active indicator */}
            {isActive && variant === 'pills' && (
              <motion.div
                layoutId="liquid-tab-indicator"
                className="absolute inset-0 rounded-pill glass-g3 glass-tint-gold glass-rim-gold -z-[1]"
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                  mass: 0.8,
                }}
                style={{ originX: 0.5 }}
              />
            )}
            {tab.icon && <span className="text-base shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={clsx(
                  'px-2 py-0.5 rounded-pill font-ui text-[11px] font-semibold',
                  isActive
                    ? 'bg-gold-tint text-gold font-bold'
                    : 'glass-g3 text-text-3',
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
