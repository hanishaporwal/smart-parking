import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Table, BarChart2 } from 'lucide-react';

export interface ChartCardShellProps {
  id?: string;
  title: string;
  whatItTells: string;
  soWhat: React.ReactNode;
  badgeText?: string;
  headerActions?: React.ReactNode;
  tableContent?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const ChartCardShell: React.FC<ChartCardShellProps> = ({
  id,
  title,
  whatItTells,
  soWhat,
  headerActions,
  tableContent,
  className,
  children,
}) => {
  const [showTable, setShowTable] = useState(false);

  return (
    <div
      id={id}
      role="region"
      aria-label={title}
      className={clsx(
        'rounded-card glass-g1 border border-white/[0.08] flex flex-col justify-between overflow-hidden shadow-glass-g1 transition-all duration-200',
        className
      )}
    >
      {/* 1. Header Bar: Title, Subtitle, Table Toggle */}
      <div className="p-4 sm:p-5 border-b border-white/[0.06] glass-header-band-gold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <h3 className="font-display font-medium text-card-title text-text-1 m-0 whitespace-nowrap truncate leading-tight">
            {title}
          </h3>
          <p className="text-[13px] text-text-2 font-ui m-0 whitespace-nowrap truncate leading-normal">
            {whatItTells}
          </p>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {headerActions}

          {tableContent && (
            <button
              type="button"
              onClick={() => setShowTable(prev => !prev)}
              aria-label={showTable ? 'Switch to chart view' : 'View as accessible table'}
              className={clsx(
                'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-pill text-xs font-ui transition-colors border',
                showTable
                  ? 'glass-g3 glass-tint-gold text-gold border-gold/40'
                  : 'glass-g3 text-text-3 hover:text-text-1 border-white/[0.08]'
              )}
            >
              {showTable ? (
                <>
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Chart</span>
                </>
              ) : (
                <>
                  <Table className="w-3.5 h-3.5" />
                  <span>Table</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Content Area: Chart or Table View */}
      <div className="p-4 sm:p-6 flex-1 min-h-[280px]">
        {showTable && tableContent ? (
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto rounded-lg border border-white/[0.06] glass-recessed p-2">
            {tableContent}
          </div>
        ) : (
          children
        )}
      </div>

      {/* 3. Footer "So what:" Sentence */}
      <div className="px-5 py-3 border-t border-white/[0.06] bg-black/25 text-xs font-ui text-text-2 leading-relaxed">
        <span className="font-semibold text-gold">So what: </span>
        <span className="text-[10px] uppercase font-mono tracking-wider text-text-3/80 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] mr-2 select-none">
          Synthetic
        </span>
        <span>{soWhat}</span>
      </div>
    </div>
  );
};
