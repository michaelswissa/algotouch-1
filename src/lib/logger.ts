
/**
 * Simple logging utility that can be toggled based on environment
 */

// Set to true to enable debug logs, false to disable
const DEBUG_MODE = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: any[]) => {
    if (DEBUG_MODE) {
      console.debug('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (DEBUG_MODE) {
      console.info('[INFO]', ...args);
    }
  },
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
};
