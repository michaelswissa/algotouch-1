
type MetricName = 'CLS' | 'FID' | 'LCP' | 'FCP' | 'TTFB';

type MetricValue = {
  name: MetricName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
};

// Thresholds as per Web Vitals documentation
const thresholds = {
  LCP: [2500, 4000], // Largest Contentful Paint
  FID: [100, 300],   // First Input Delay
  CLS: [0.1, 0.25],  // Cumulative Layout Shift
  FCP: [1800, 3000], // First Contentful Paint
  TTFB: [800, 1800]  // Time to First Byte
};

// Determine the rating based on thresholds
function getRating(name: MetricName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const [good, poor] = thresholds[name];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

// Function to send metrics to analytics
function sendToAnalytics(metric: MetricValue) {
  // This would typically send to your analytics service
  console.log(`Web Vital: ${metric.name} - ${metric.value} (${metric.rating})`);
  
  // In a real implementation, you'd send to an analytics service
  // Example:
  // window.gtag?.('event', 'web_vitals', {
  //   event_category: 'Web Vitals',
  //   event_label: metric.name,
  //   value: Math.round(metric.value),
  //   metric_rating: metric.rating,
  //   non_interaction: true,
  // });
}

// Export a handler to process and report the metrics
export function reportWebVitals() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    import('web-vitals').then(({ onCLS, onFID, onLCP, onFCP, onTTFB }) => {
      // These functions subscribe to the Core Web Vitals
      onCLS(metric => {
        const metricValue: MetricValue = {
          name: 'CLS',
          value: metric.value,
          rating: getRating('CLS', metric.value)
        };
        sendToAnalytics(metricValue);
      });
      
      onFID(metric => {
        const metricValue: MetricValue = {
          name: 'FID',
          value: metric.value,
          rating: getRating('FID', metric.value)
        };
        sendToAnalytics(metricValue);
      });
      
      onLCP(metric => {
        const metricValue: MetricValue = {
          name: 'LCP',
          value: metric.value,
          rating: getRating('LCP', metric.value)
        };
        sendToAnalytics(metricValue);
      });
      
      onFCP(metric => {
        const metricValue: MetricValue = {
          name: 'FCP',
          value: metric.value,
          rating: getRating('FCP', metric.value)
        };
        sendToAnalytics(metricValue);
      });
      
      onTTFB(metric => {
        const metricValue: MetricValue = {
          name: 'TTFB',
          value: metric.value,
          rating: getRating('TTFB', metric.value)
        };
        sendToAnalytics(metricValue);
      });
    });
  }
}

// Utility function to log performance marks for custom metrics
export function markPerformance(markName: string) {
  if (typeof window !== 'undefined' && 'performance' in window) {
    performance.mark(markName);
  }
}

// Measure time between two marks
export function measurePerformance(measureName: string, startMark: string, endMark: string) {
  if (typeof window !== 'undefined' && 'performance' in window) {
    try {
      performance.measure(measureName, startMark, endMark);
      const entries = performance.getEntriesByName(measureName);
      if (entries.length > 0) {
        console.log(`${measureName}: ${entries[0].duration.toFixed(2)}ms`);
      }
    } catch (e) {
      console.error('Error measuring performance:', e);
    }
  }
}
