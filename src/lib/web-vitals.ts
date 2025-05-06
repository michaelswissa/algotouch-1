
import * as webVitals from 'web-vitals';

/**
 * Metric type definition
 */
export type Metric = {
  name: string;
  value: number;
  id: string;
};

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
  webVitals.onLCP(sendMetric);
  
  // First Input Delay
  webVitals.onFID(sendMetric);
  
  // Cumulative Layout Shift
  webVitals.onCLS(sendMetric);
  
  // First Contentful Paint
  webVitals.onFCP(sendMetric);
  
  // Time to First Byte
  webVitals.onTTFB(sendMetric);
};

/**
 * Monitor Core Web Vitals and provide warnings for poor values
 */
export const monitorCoreWebVitals = () => {
  webVitals.onLCP(metric => {
    if (metric.value > 2500) {
      console.warn(`LCP too high: ${Math.round(metric.value)}ms`, {
        recommendedValue: '< 2.5s',
        helpUrl: 'https://web.dev/lcp/'
      });
    }
  });
  
  webVitals.onFID(metric => {
    if (metric.value > 100) {
      console.warn(`FID too high: ${Math.round(metric.value)}ms`, {
        recommendedValue: '< 100ms',
        helpUrl: 'https://web.dev/fid/'
      });
    }
  });
  
  webVitals.onCLS(metric => {
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
