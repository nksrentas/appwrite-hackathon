import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useThrottle = <T extends (...args: any[]) => any>(func: T, delay: number): T => {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        func(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [func, delay]
  );
};

export const useVirtualScroll = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  buffer: number = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + buffer
  );

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
    }));
  }, [items, startIndex, endIndex]);

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop,
  };
};

export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
): [React.RefCallback<Element>, boolean] => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [node, setNode] = useState<Element | null>(null);

  const observer = useMemo(() => {
    if (typeof window === 'undefined') return null;

    return new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);
  }, [options]);

  useEffect(() => {
    if (!observer || !node) return;

    observer.observe(node);

    return () => {
      observer.unobserve(node);
    };
  }, [observer, node]);

  const ref = useCallback((element: Element | null) => {
    setNode(element);
  }, []);

  return [ref, isIntersecting];
};

export const createOptimizedAnimation = (
  element: HTMLElement,
  properties: Record<string, string | number>,
  duration: number = 300,
  easing: string = 'ease-out'
): Promise<void> => {
  return new Promise((resolve) => {
    if ('animate' in element) {
      const keyframes = [
        {},
        properties
      ];

      const animation = element.animate(keyframes, {
        duration,
        easing,
        fill: 'forwards'
      });

      animation.onfinish = () => resolve();
    } else {
      const originalTransition = element.style.transition;
      element.style.transition = `all ${duration}ms ${easing}`;

      Object.entries(properties).forEach(([property, value]) => {
        (element.style as any)[property] = value;
      });

      setTimeout(() => {
        element.style.transition = originalTransition;
        resolve();
      }, duration);
    }
  });
};

class AnimationFrameManager {
  private callbacks = new Set<() => void>();
  private rafId: number | null = null;

  add(callback: () => void) {
    this.callbacks.add(callback);
    this.start();
  }

  remove(callback: () => void) {
    this.callbacks.delete(callback);
    if (this.callbacks.size === 0) {
      this.stop();
    }
  }

  private start() {
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  private stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = () => {
    this.callbacks.forEach(callback => callback());
    
    if (this.callbacks.size > 0) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.rafId = null;
    }
  };
}

export const animationFrameManager = new AnimationFrameManager();

export const performanceMonitor = {
  startMark: (name: string) => {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(`${name}-start`);
    }
  },

  endMark: (name: string) => {
    if ('performance' in window && 'mark' in performance && 'measure' in performance) {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }
  },

  getMeasures: (name?: string): PerformanceEntry[] => {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const measures = performance.getEntriesByType('measure');
      return name ? measures.filter(entry => entry.name === name) : measures;
    }
    return [];
  },

  clearMarks: (name?: string) => {
    if ('performance' in window && 'clearMarks' in performance) {
      performance.clearMarks(name);
    }
  },

  clearMeasures: (name?: string) => {
    if ('performance' in window && 'clearMeasures' in performance) {
      performance.clearMeasures(name);
    }
  },
};

export const createMemoizedSelector = <T, R>(
  selector: (input: T) => R,
  equalityFn?: (a: R, b: R) => boolean
) => {
  let lastInput: T;
  let lastResult: R;

  return (input: T): R => {
    if (lastInput !== input) {
      const newResult = selector(input);
      
      if (equalityFn) {
        if (!equalityFn(lastResult, newResult)) {
          lastResult = newResult;
        }
      } else {
        lastResult = newResult;
      }
      
      lastInput = input;
    }
    
    return lastResult;
  };
};

export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) => {
  return React.lazy(importFunc);
};

export const dynamicImport = async <T>(
  importPath: string
): Promise<T> => {
  const module = await import(importPath);
  return module.default || module;
};

export const useCleanup = (cleanup: () => void) => {
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
};

export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T
): T => {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(((...args) => {
    return callbackRef.current(...args);
  }) as T, []);
};

export const createOptimizedImageProps = (
  src: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'auto';
  } = {}
) => {
  const { width, height, quality = 75, format = 'auto' } = options;
  
  const optimizedSrc = src;
  
  return {
    src: optimizedSrc,
    srcSet: `${optimizedSrc} 1x, ${optimizedSrc} 2x`,
    loading: 'lazy' as const,
    decoding: 'async' as const,
    ...(width && { width }),
    ...(height && { height }),
  };
};

export const preloadRoute = (routeComponent: () => Promise<any>) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      routeComponent();
    });
  } else {
    setTimeout(() => {
      routeComponent();
    }, 1);
  }
};

export const performanceBudget = {
  checkLCP: (threshold: number = 2500) => {
    if ('performance' in window) {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'largest-contentful-paint') {
            const lcp = entry.startTime;
            if (lcp > threshold) {
              console.warn(`LCP (${lcp}ms) exceeds budget (${threshold}ms)`);
            }
          }
        });
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    }
  },

  checkFID: (threshold: number = 100) => {
    if ('performance' in window) {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'first-input') {
            const fid = entry.processingStart - entry.startTime;
            if (fid > threshold) {
              console.warn(`FID (${fid}ms) exceeds budget (${threshold}ms)`);
            }
          }
        });
      }).observe({ entryTypes: ['first-input'] });
    }
  },

  checkCLS: (threshold: number = 0.1) => {
    if ('performance' in window) {
      let clsValue = 0;
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
            clsValue += entry.value;
            if (clsValue > threshold) {
              console.warn(`CLS (${clsValue}) exceeds budget (${threshold})`);
            }
          }
        });
      }).observe({ entryTypes: ['layout-shift'] });
    }
  },
};