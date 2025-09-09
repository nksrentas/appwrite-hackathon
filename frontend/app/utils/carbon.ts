import { format } from 'date-fns';

/**
 * Carbon footprint calculation utilities
 */

export interface CarbonMetric {
  value: number;
  unit: 'g' | 'kg' | 'lb';
  confidence: number;
  source: string;
  timestamp: string;
}

export interface ActivityData {
  id: string;
  type: 'commit' | 'pr' | 'ci_run' | 'deployment';
  repository: string;
  carbon: CarbonMetric;
  details: Record<string, unknown>;
  createdAt: string;
}

/**
 * Format carbon emissions with appropriate unit
 */
export function formatCarbon(value: number, unit: CarbonMetric['unit'] = 'g'): string {
  if (value < 1000 && unit === 'g') {
    return `${value.toFixed(1)}g CO₂`;
  } else if (value >= 1000 && unit === 'g') {
    return `${(value / 1000).toFixed(2)}kg CO₂`;
  } else if (unit === 'kg') {
    return `${value.toFixed(2)}kg CO₂`;
  } else {
    return `${value.toFixed(2)}${unit} CO₂`;
  }
}

/**
 * Get carbon intensity level based on value
 */
export function getCarbonIntensity(value: number): 'low' | 'medium' | 'high' {
  if (value < 100) return 'low';
  if (value < 500) return 'medium';
  return 'high';
}

/**
 * Get carbon intensity color classes
 */
export function getCarbonIntensityClasses(intensity: 'low' | 'medium' | 'high'): string {
  switch (intensity) {
    case 'low':
      return 'carbon-badge-low';
    case 'medium':
      return 'carbon-badge-medium';
    case 'high':
      return 'carbon-badge-high';
    default:
      return 'carbon-badge-medium';
  }
}

/**
 * Format confidence level as percentage
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Get relative time description for activity
 */
export function getRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  return format(new Date(timestamp), 'MMM d, h:mm a');
}

/**
 * Calculate carbon savings compared to baseline
 */
export function calculateCarbonSavings(
  current: number,
  baseline: number
): {
  savings: number;
  percentage: number;
  isReduction: boolean;
} {
  const savings = baseline - current;
  const percentage = baseline > 0 ? (savings / baseline) * 100 : 0;

  return {
    savings: Math.abs(savings),
    percentage: Math.abs(percentage),
    isReduction: savings > 0,
  };
}

/**
 * Generate mock carbon data for development
 */
export function generateMockCarbonData(days: number = 30): CarbonMetric[] {
  const data: CarbonMetric[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    data.push({
      value: Math.random() * 1000 + 50,
      unit: 'g',
      confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
      source: 'EPA eGRID',
      timestamp: date.toISOString(),
    });
  }

  return data;
}
