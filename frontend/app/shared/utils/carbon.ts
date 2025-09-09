export function formatCarbon(value: number, unit: 'g' | 'kg' | 'lb' = 'g'): string {
  if (value === 0) return '0';
  
  let displayValue = value;
  let displayUnit = unit;
  
  if (unit === 'g' && value >= 1000) {
    displayValue = value / 1000;
    displayUnit = 'kg';
  }
  
  const formatted = displayValue < 10 
    ? displayValue.toFixed(1) 
    : Math.round(displayValue).toString();
  
  return `${formatted}${displayUnit}`;
}

export function getCarbonIntensity(value: number): 'low' | 'medium' | 'high' {
  if (value <= 50) return 'low';
  if (value <= 200) return 'medium';
  return 'high';
}

export function getCarbonIntensityClasses(intensity: 'low' | 'medium' | 'high'): string {
  switch (intensity) {
    case 'low':
      return 'bg-primary-100 text-primary-800 border-primary-200';
    case 'medium':
      return 'bg-efficiency-100 text-efficiency-800 border-efficiency-200';
    case 'high':
      return 'bg-danger-100 text-danger-800 border-danger-200';
    default:
      return 'bg-carbon-100 text-carbon-800 border-carbon-200';
  }
}

export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}

export function calculateCarbonFootprint(
  activityType: 'commit' | 'pr' | 'ci_run' | 'deployment',
  details: Record<string, any>
): number {
  
  const baseCosts = {
    commit: 2, // 2g CO2 per commit (code analysis, storage)
    pr: 5, // 5g CO2 per PR (additional review processes)
    ci_run: 20, // 20g CO2 per CI run (compute resources)
    deployment: 50, // 50g CO2 per deployment (infrastructure)
  };
  
  let multiplier = 1;
  
  if (activityType === 'ci_run') {
    const duration = details.duration || '1m';
    const minutes = parseInt(duration.replace(/[^\d]/g, '')) || 1;
    multiplier = Math.max(1, minutes / 5); // Scale with duration
  }
  
  if (activityType === 'commit') {
    const filesChanged = details.files_changed || 1;
    multiplier = Math.max(1, Math.log10(filesChanged + 1));
  }
  
  return Math.round(baseCosts[activityType] * multiplier);
}