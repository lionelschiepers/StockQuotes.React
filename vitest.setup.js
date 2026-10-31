import '@testing-library/jest-dom/vitest';

globalThis.ResizeObserver = class ResizeObserver {
  // jsdom does no layout, so there is never a size change to report.
  observe() {
    // no-op
  }
  unobserve() {
    // no-op
  }
  disconnect() {
    // no-op
  }
};
