import { useEffect, useState, useRef } from 'react';

export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  if (typeof window === 'undefined') return;

  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.setAttribute('role', 'status');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';

  document.body.appendChild(announcement);
  announcement.textContent = message;

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

export const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'summary',
  'details[open]',
].join(', ');

export const getFocusableElements = (container: HTMLElement | Document = document): HTMLElement[] => {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)).filter(
    (element): element is HTMLElement => {
      return (
        element instanceof HTMLElement &&
        element.offsetWidth > 0 &&
        element.offsetHeight > 0 &&
        !element.hasAttribute('disabled') &&
        element.tabIndex !== -1
      );
    }
  );
};

export const trapFocus = (container: HTMLElement): (() => void) => {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return () => {};

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  container.addEventListener('keydown', handleTabKey);

  firstElement.focus();

  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
};

export const useReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
};

export const useHighContrast = (): boolean => {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersHighContrast;
};

export const useFocusManagement = () => {
  const focusRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const setFocusRef = (element: HTMLElement | null) => {
    focusRef.current = element;
  };

  const saveFocus = () => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  };

  const focusElement = () => {
    if (focusRef.current) {
      focusRef.current.focus();
    }
  };

  return {
    setFocusRef,
    saveFocus,
    restoreFocus,
    focusElement,
  };
};

export const handleKeyboardNavigation = (
  e: React.KeyboardEvent,
  options: {
    onEnter?: () => void;
    onSpace?: () => void;
    onEscape?: () => void;
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
  }
) => {
  switch (e.key) {
    case 'Enter':
      if (options.onEnter) {
        e.preventDefault();
        options.onEnter();
      }
      break;
    case ' ':
      if (options.onSpace) {
        e.preventDefault();
        options.onSpace();
      }
      break;
    case 'Escape':
      if (options.onEscape) {
        e.preventDefault();
        options.onEscape();
      }
      break;
    case 'ArrowUp':
      if (options.onArrowUp) {
        e.preventDefault();
        options.onArrowUp();
      }
      break;
    case 'ArrowDown':
      if (options.onArrowDown) {
        e.preventDefault();
        options.onArrowDown();
      }
      break;
    case 'ArrowLeft':
      if (options.onArrowLeft) {
        e.preventDefault();
        options.onArrowLeft();
      }
      break;
    case 'ArrowRight':
      if (options.onArrowRight) {
        e.preventDefault();
        options.onArrowRight();
      }
      break;
  }
};

export const generateAriaProps = {
  liveRegion: (priority: 'polite' | 'assertive' = 'polite') => ({
    'aria-live': priority,
    'aria-atomic': 'true',
    role: 'status',
  }),

  button: (options: {
    pressed?: boolean;
    expanded?: boolean;
    haspopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
    controls?: string;
    describedby?: string;
    labelledby?: string;
  }) => ({
    role: 'button',
    tabIndex: 0,
    ...(options.pressed !== undefined && { 'aria-pressed': options.pressed.toString() }),
    ...(options.expanded !== undefined && { 'aria-expanded': options.expanded.toString() }),
    ...(options.haspopup !== undefined && { 
      'aria-haspopup': options.haspopup === true ? 'true' : options.haspopup.toString() 
    }),
    ...(options.controls && { 'aria-controls': options.controls }),
    ...(options.describedby && { 'aria-describedby': options.describedby }),
    ...(options.labelledby && { 'aria-labelledby': options.labelledby }),
  }),

  progressbar: (options: {
    min?: number;
    max?: number;
    value?: number;
    label?: string;
    describedby?: string;
  }) => ({
    role: 'progressbar',
    'aria-valuemin': (options.min ?? 0).toString(),
    'aria-valuemax': (options.max ?? 100).toString(),
    'aria-valuenow': (options.value ?? 0).toString(),
    'aria-valuetext': options.label ? `${options.value}% ${options.label}` : `${options.value}%`,
    ...(options.describedby && { 'aria-describedby': options.describedby }),
  }),

  alert: (level: 'info' | 'warning' | 'error' = 'info') => ({
    role: 'alert',
    'aria-live': level === 'error' ? 'assertive' : 'polite',
    'aria-atomic': 'true',
  }),

  tablist: () => ({
    role: 'tablist',
  }),

  tab: (options: {
    selected: boolean;
    controls: string;
    id: string;
  }) => ({
    role: 'tab',
    'aria-selected': options.selected.toString(),
    'aria-controls': options.controls,
    id: options.id,
    tabIndex: options.selected ? 0 : -1,
  }),

  tabpanel: (options: {
    labelledby: string;
    id: string;
  }) => ({
    role: 'tabpanel',
    'aria-labelledby': options.labelledby,
    id: options.id,
    tabIndex: 0,
  }),
};

export const getContrastRatio = (color1: string, color2: string): number => {
  const getLuminance = (color: string): number => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const getRGB = (value: number) => {
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    };

    return 0.2126 * getRGB(r) + 0.7152 * getRGB(g) + 0.0722 * getRGB(b);
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
};

export const meetsWCAGContrast = (
  color1: string, 
  color2: string, 
  level: 'AA' | 'AAA' = 'AA',
  fontSize: 'normal' | 'large' = 'normal'
): boolean => {
  const contrast = getContrastRatio(color1, color2);
  
  if (level === 'AAA') {
    return fontSize === 'large' ? contrast >= 4.5 : contrast >= 7;
  } else {
    return fontSize === 'large' ? contrast >= 3 : contrast >= 4.5;
  }
};