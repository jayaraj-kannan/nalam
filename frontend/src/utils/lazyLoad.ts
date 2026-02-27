/**
 * Lazy Loading Utilities for Code Splitting
 * Requirements: 5.1 - Elderly-friendly interface performance
 */

import { lazy, ComponentType } from 'react';

/**
 * Retry mechanism for lazy-loaded components
 * Handles network failures gracefully
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retries: number = 3,
  interval: number = 1000
): React.LazyExoticComponent<T> {
  return lazy(() => {
    return new Promise<{ default: T }>((resolve, reject) => {
      const attemptImport = (attemptsLeft: number) => {
        componentImport()
          .then(resolve)
          .catch((error) => {
            if (attemptsLeft === 1) {
              reject(error);
              return;
            }
            
            setTimeout(() => {
              attemptImport(attemptsLeft - 1);
            }, interval);
          });
      };
      
      attemptImport(retries);
    });
  });
}

/**
 * Preload a lazy component
 * Useful for prefetching components that will likely be needed
 */
export function preloadComponent(
  componentImport: () => Promise<{ default: ComponentType<any> }>
): void {
  componentImport().catch(() => {
    // Silently fail - component will be loaded when actually needed
  });
}

/**
 * Lazy load with prefetch on hover
 * Improves perceived performance by loading before click
 */
export function createPrefetchableComponent<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  const LazyComponent = lazyWithRetry(componentImport);
  
  return {
    Component: LazyComponent,
    preload: () => preloadComponent(componentImport),
  };
}
