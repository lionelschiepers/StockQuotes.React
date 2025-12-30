import React from 'react';

const SkeletonLoader = () => {
  const shimmerAnimation = `
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
  `;

  return (
    <div className="p-5 bg-white dark:bg-gray-900 rounded-lg">
      {/* Loading banner */}
      <div className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 p-8 mb-5 rounded-lg font-bold text-lg min-h-[100px] flex items-center justify-center border border border-gray-200 dark:border-gray-600">
        Loading portfolio data
      </div>

      {/* Summary placeholder cards */}
      <div className="flex gap-5 mb-8">
        <div className="h-20 w-52 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-lg animate-pulse"></div>
        <div className="h-20 w-52 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-lg animate-pulse"></div>
        <div className="h-20 w-52 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-lg animate-pulse"></div>
      </div>

      {/* Table placeholder */}
      <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-600">
        <div className="h-8 mb-3 rounded bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse"></div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-10 mb-2 rounded bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse"
            style={{ animationDelay: `${i * 0.1}s` }}
          ></div>
        ))}
      </div>

      {/* CSS for animations */}
      <style dangerouslySetInnerHTML={{ __html: shimmerAnimation }} />
    </div>
  );
};

export default SkeletonLoader;
