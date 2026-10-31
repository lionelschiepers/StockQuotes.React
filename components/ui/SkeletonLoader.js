import React from 'react';

const bar = 'animate-pulse rounded-sm bg-shade';
const ROWS = Array.from({ length: 8 }, (_, index) => index);
const FIGURE_COLUMNS = Array.from({ length: 8 }, (_, index) => index);

const SkeletonLoader = () => (
  <div aria-busy="true" aria-live="polite" className="pt-10 sm:pt-14">
    <span className="sr-only">Loading your portfolio</span>
    <div className={`${bar} h-14 w-[min(32rem,100%)] sm:h-16`} />
    <div className={`${bar} mt-5 h-5 w-[min(40rem,100%)]`} />
    <div className={`${bar} mt-10 h-12 w-full sm:h-14`} />
    <div className="mt-10 space-y-3">
      {[0, 1, 2].map((line) => (
        <div key={line} className={`${bar} h-6 w-72 max-w-full`} />
      ))}
    </div>
    <div className={`${bar} mt-16 h-7 w-56`} />
    <div className="mt-5 border-t-2 border-rule">
      {ROWS.map((row) => (
        <div
          key={row}
          className="flex h-14 items-center gap-6 border-b border-rule px-3"
        >
          <div className={`${bar} h-4 w-48 shrink-0`} />
          {FIGURE_COLUMNS.map((column) => (
            <div key={column} className={`${bar} hidden h-4 flex-1 md:block`} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default SkeletonLoader;
