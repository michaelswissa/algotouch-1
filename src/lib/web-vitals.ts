
import { getLCP, getFID, getCLS, getFCP, getTTFB, Metric } from 'web-vitals';

/**
 * Send metrics to an analytics endpoint
 */
const sendMetric = ({ name, value, id }: Metric) => {
  // Implement analytics tracking here
  // For now, just log to console in development
  if (import.meta.env.DEV) {
    console.log(`Web Vitals: ${name}`, { value, id });
  }
  
  // In production, you could send this to your analytics service
  // Example:
  // fetch('/api/metrics', {
  //   method: 'POST',
  //   body: JSON.stringify({ name, value, id }),
  //   headers: { 'Content-Type': 'application/json' },
  // });
};

/**
 * Report Web Vitals metrics
 */
export const reportWebVitals = () => {
  // Largest Contentful Paint
  getLCP(sendMetric);
  
  // First Input Delay
  getFID(sendMetric);
  
  // Cumulative Layout Shift
  getCLS(sendMetric);
  
  // First Contentful Paint
  getFCP(sendMetric);
  
  // Time to First Byte
  getTTFB(sendMetric);
};

/**
 * Monitor Core Web Vitals and provide warnings for poor values
 */
export const monitorCoreWebVitals = () => {
  getLCP(metric => {
    if (metric.value > 2500) {
      console.warn(`LCP too high: ${Math.round(metric.value)}ms`, {
        recommendedValue: '< 2.5s',
        helpUrl: 'https://web.dev/lcp/'
      });
    }
  });
  
  getFID(metric => {
    if (metric.value > 100) {
      console.warn(`FID too high: ${Math.round(metric.value)}ms`, {
        recommendedValue: '< 100ms',
        helpUrl: 'https://web.dev/fid/'
      });
    }
  });
  
  getCLS(metric => {
    if (metric.value > 0.1) {
      console.warn(`CLS too high: ${metric.value.toFixed(3)}`, {
        recommendedValue: '< 0.1',
        helpUrl: 'https://web.dev/cls/'
      });
    }
  });
};

/**
 * Get a performance mark timing
 */
export const markPerformance = (markName: string) => {
  if (typeof performance !== 'undefined') {
    performance.mark(markName);
  }
};

/**
 * Measure time between two performance marks
 */
export const measurePerformance = (measureName: string, startMark: string, endMark: string) => {
  if (typeof performance !== 'undefined') {
    try {
      performance.measure(measureName, startMark, endMark);
      const entries = performance.getEntriesByName(measureName);
      if (entries.length > 0) {
        console.log(`${measureName}: ${entries[0].duration.toFixed(2)}ms`);
      }
    } catch (error) {
      console.error('Error measuring performance:', error);
    }
  }
};
