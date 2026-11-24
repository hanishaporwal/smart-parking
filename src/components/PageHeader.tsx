import React from 'react';
import { clsx } from 'clsx';

export interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  badges?: React.ReactNode;
  subtitle: string;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  badges,
  subtitle,
  className,
}) => {
  return (
    <header className={clsx('pb-3.5 border-b border-border/40', className)}>
      {eyebrow && (
        <div className="text-[12px] font-ui font-semibold uppercase tracking-wider text-gold mb-1">
          {eyebrow}
        </div>
      )}
      {/* 1. Heading: full-width in one line */}
      <h1 className="text-[22px] sm:text-[26px] md:text-[30px] lg:text-[34px] xl:text-[38px] 2xl:text-[40px] font-display font-medium text-text m-0 leading-[1.15] tracking-[-0.02em] whitespace-nowrap">
        {title}
      </h1>

      {/* 2. Sub-heading row: Subtitle on left, three buttons/badges on right */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-1.5">
        <p
          className="text-[15px] leading-[1.5] text-text-2 max-w-[80ch] [text-wrap:pretty] m-0"
          style={{ textWrap: 'pretty' }}
        >
          {subtitle}
        </p>
        {badges && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 md:justify-end">
            {badges}
          </div>
        )}
      </div>
    </header>
  );
};
