import React from 'react';

const SkeletonLoader = () => {
  return (
    <div className="yahoo-finance-container bg-white dark:bg-gray-800 p-4 rounded-lg">
      <div className="text-left mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-5 w-48 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded animate-pulse"
                style={{ animationDelay: `${i * 0.05}s` }}
              ></div>
            ))}
          </div>
          <div className="text-right">
            <div className="inline-block h-9 w-32 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
          </div>
        </div>
      </div>

      <div className="text-left mb-4 space-y-2">
        <div className="h-5 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>

      <div className="yahoo-finance-table-wrapper">
        <div 
          className="flex font-bold border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <div style={{ flex: '0 0 350px', minWidth: '200px' }} className="px-2 py-1">
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div style={{ flex: '0 0 110px', minWidth: '70px' }} className="px-2 py-1">
            <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div style={{ flex: '0 0 80px', minWidth: '70px' }} className="px-2 py-1">
            <div className="h-4 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div style={{ flex: '0 0 80px', minWidth: '70px' }} className="px-2 py-1">
            <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div style={{ flex: '0 0 120px', minWidth: '100px' }} className="px-2 py-1">
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div style={{ flex: '0 0 130px', minWidth: '100px' }} className="px-2 py-1">
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div style={{ flex: '0 0 90px', minWidth: '90px' }} className="px-2 py-1">
            <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div style={{ flex: '0 0 90px', minWidth: '90px' }} className="px-2 py-1">
            <div className="h-4 w-14 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div style={{ flex: '0 0 120px', minWidth: '100px' }} className="px-2 py-1">
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div
              key={i}
              className="flex items-center"
              style={{ height: '32px' }}
            >
              <div style={{ flex: '0 0 350px', minWidth: '200px' }} className="px-2">
                <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.03}s` }}></div>
              </div>
              <div style={{ flex: '0 0 110px', minWidth: '70px' }} className="px-2">
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.03}s` }}></div>
              </div>
              <div style={{ flex: '0 0 80px', minWidth: '70px' }} className="px-2">
                <div className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.03}s` }}></div>
              </div>
              <div style={{ flex: '0 0 80px', minWidth: '70px' }} className="px-2">
                <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.03}s` }}></div>
              </div>
              <div style={{ flex: '0 0 120px', minWidth: '100px' }} className="px-2">
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.03}s` }}></div>
              </div>
              <div style={{ flex: '0 0 130px', minWidth: '100px' }} className="px-2">
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.03}s` }}></div>
              </div>
              <div style={{ flex: '0 0 90px', minWidth: '90px' }} className="px-2">
                <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.03}s` }}></div>
              </div>
              <div style={{ flex: '0 0 90px', minWidth: '90px' }} className="px-2">
                <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.03}s` }}></div>
              </div>
              <div style={{ flex: '0 0 120px', minWidth: '100px' }} className="px-2">
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.03}s` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkeletonLoader;
