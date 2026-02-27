/**
 * Web Vitals Performance Monitoring
 * Requirements: 5.1 - Monitor elderly-friendly interface performance
 * 
 * Tracks Core Web Vitals:
 * - LCP (Largest Contentful Paint): Loading performance
 * - FID (First Input Delay): Interactivity
 * - CLS (Cumulative Layout Shift): Visual stability
 * - FCP (First Contentful Paint): Initial render
 * - TTFB (Time to First Byte): Server response time
 */

export interface WebVitalMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

/**
 * Thresholds for Web Vitals ratings
 */
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },      // Largest Contentful Paint (ms)
  FID: { good: 100, poor: 300 },        // First Input Delay (ms)
  CLS: { good: 0.1, poor: 0.25 },       // Cumulative Layout Shift (score)
  FCP: { good: 1800, poor: 3000 },      // First Contentful Paint (ms)
  TTFB: { good: 800, poor: 1800 },      // Time to First Byte (ms)
};

/**
 * Get rating based on metric value
 */
function getRating(name: WebVitalMetric['name'], value: number): WebVitalMetric['rating'] {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Report Web Vital metric
 */
function reportMetric(metric: WebVitalMetric): void {
  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
    });
  }

  // Send to analytics in production
  if (import.meta.env.PROD) {
    // TODO: Send to CloudWatch or analytics service
    // Example: sendToAnalytics('web-vitals', metric);
  }
}

/**
 * Initialize Web Vitals monitoring
 */
export async function initWebVitals(): Promise<void> {
  try {
    // Dynamically import web-vitals library
    const { onCLS, onFID, onFCP, onLCP, onTTFB } = await import('web-vitals');

    // Monitor Cumulative Layout Shift
    onCLS((metric) => {
      reportMetric({
        name: 'CLS',
        value: metric.value,
        rating: getRating('CLS', metric.value),
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      });
    });

    // Monitor First Input Delay
    onFID((metric) => {
      reportMetric({
        name: 'FID',
        value: metric.value,
        rating: getRating('FID', metric.value),
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      });
    });

    // Monitor First Contentful Paint
    onFCP((metric) => {
      reportMetric({
        name: 'FCP',
        value: metric.value,
        rating: getRating('FCP', metric.value),
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      });
    });

    // Monitor Largest Contentful Paint
    onLCP((metric) => {
      reportMetric({
        name: 'LCP',
        value: metric.value,
        rating: getRating('LCP', metric.value),
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      });
    });

    // Monitor Time to First Byte
    onTTFB((metric) => {
      reportMetric({
        name: 'TTFB',
        value: metric.value,
        rating: getRating('TTFB', metric.value),
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      });
    });
  } catch (error) {
    console.error('Failed to initialize Web Vitals:', error);
  }
}

/**
 * Custom performance marks for specific features
 */
export const PerformanceMarks = {
  DASHBOARD_LOAD_START: 'dashboard-load-start',
  DASHBOARD_LOAD_END: 'dashboard-load-end',
  HEALTH_DATA_SUBMIT_START: 'health-data-submit-start',
  HEALTH_DATA_SUBMIT_END: 'health-data-submit-end',
  EMERGENCY_ALERT_START: 'emergency-alert-start',
  EMERGENCY_ALERT_END: 'emergency-alert-end',
} as const;

/**
 * Mark performance timing
 */
export function markPerformance(name: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure performance between two marks
 */
export function measurePerformance(
  name: string,
  startMark: string,
  endMark: string
): number | null {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      
      if (import.meta.env.DEV) {
        console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
      }
      
      return measure.duration;
    } catch (error) {
      console.error('Performance measurement failed:', error);
      return null;
    }
  }
  return null;
}

/**
 * Clear performance marks and measures
 */
export function clearPerformanceMarks(): void {
  if (typeof performance !== 'undefined') {
    performance.clearMarks();
    performance.clearMeasures();
  }
}
