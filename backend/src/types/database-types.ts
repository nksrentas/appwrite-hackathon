export interface User {
  $id: string;
  github_id: string;
  username: string;
  email: string;
  avatar_url?: string;
  location?: {
    country: string;
    region?: string;
    coordinates?: [number, number];
  };
  preferences: {
    units: 'metric' | 'imperial';
    privacy_level: 'public' | 'anonymous' | 'private';
    notifications: boolean;
    methodology_detail: 'simple' | 'detailed' | 'expert';
  };
  github_tokens?: {
    access_token?: string;
    refresh_token?: string;
    expires_at?: string;
  };
  onboarding_completed: boolean;
  $createdAt: string;
  $updatedAt: string;
}

export interface Activity {
  $id: string;
  user_id: string;
  type: 'commit' | 'pr' | 'ci_run' | 'deployment' | 'local_dev';
  
  repository?: {
    name: string;
    full_name: string;
    private: boolean;
  };
  
  commit?: {
    sha: string;
    message: string;
    additions: number;
    deletions: number;
    changed_files: number;
  };
  
  ci_data?: {
    provider: 'github_actions' | 'circleci' | 'jenkins';
    duration_seconds: number;
    success: boolean;
    runner_type: string;
  };
  
  local_data?: {
    duration_minutes: number;
    cpu_usage_avg: number;
    tools_used: string[];
  };
  
  carbon_kg: number;
  calculation_confidence: 'high' | 'medium' | 'low';
  
  timestamp: string;
  $createdAt: string;
}

export interface Calculation {
  $id: string;
  activity_id: string;
  
  emission_factors: {
    source: 'epa_egrid' | 'aws_carbon' | 'electricity_maps' | 'cached';
    factor_kg_per_kwh: number;
    region: string;
    last_updated: string;
  };
  
  energy_breakdown: {
    compute_kwh: number;
    network_kwh: number;
    storage_kwh: number;
    cooling_kwh: number;
    total_kwh: number;
  };
  
  methodology_version: string;
  calculation_timestamp: string;
  raw_data: Record<string, any>;
  confidence_factors: {
    data_quality: number;
    methodology_certainty: number;
    temporal_accuracy: number;
  };
  
  $createdAt: string;
}

export interface LeaderboardEntry {
  $id: string;
  user_id: string;
  
  period_type: 'daily' | 'weekly' | 'monthly' | 'all_time';
  period_start: string;
  period_end: string;
  
  metrics: {
    total_carbon_kg: number;
    carbon_per_commit: number;
    carbon_per_line_added: number;
    efficiency_score: number;
    commits_count: number;
    active_days: number;
  };
  
  rank: number;
  total_participants: number;
  percentile: number;
  
  last_updated: string;
  $createdAt: string;
}

export interface EmissionFactor {
  $id: string;
  
  region: {
    country: string;
    state_province?: string;
    grid_region?: string;
  };
  
  factor_kg_co2_per_kwh: number;
  renewable_percentage: number;
  
  source: {
    name: 'EPA eGRID' | 'AWS Carbon API' | 'Electricity Maps';
    url: string;
    methodology: string;
  };
  
  valid_from: string;
  valid_until: string;
  last_updated: string;
  confidence_rating: 'high' | 'medium' | 'low';
  
  $createdAt: string;
}

export interface Challenge {
  $id: string;
  
  name: string;
  description: string;
  category: 'efficiency' | 'awareness' | 'reduction' | 'methodology';
  
  criteria: {
    metric: 'carbon_per_commit' | 'weekly_total' | 'efficiency_improvement';
    target_value: number;
    comparison: 'less_than' | 'greater_than' | 'percentage_improvement';
    time_frame_days: number;
  };
  
  badge_image_id?: string;
  points: number;
  
  start_date: string;
  end_date: string;
  
  participants: string[];
  completions: {
    user_id: string;
    completed_at: string;
    final_value: number;
  }[];
  
  $createdAt: string;
}

export interface Insight {
  $id: string;
  user_id: string;
  
  type: 'efficiency_tip' | 'pattern_analysis' | 'comparison' | 'achievement';
  title: string;
  description: string;
  
  data_points: {
    current_value: number;
    comparison_value?: number;
    improvement_potential: number;
    confidence: number;
  };
  
  actions: {
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    estimated_impact_kg_co2: number;
  }[];
  
  shown_to_user: boolean;
  dismissed: boolean;
  acted_upon: boolean;
  valid_until: string;
  
  $createdAt: string;
}

export interface GitHubWebhookPayload {
  action?: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    owner: {
      login: string;
      id: number;
    };
  };
  sender: {
    login: string;
    id: number;
  };
  commits?: GitHubCommit[];
  head_commit?: GitHubCommit;
  pull_request?: GitHubPullRequest;
  workflow_run?: GitHubWorkflowRun;
}

export interface GitHubCommit {
  id: string;
  message: string;
  timestamp: string;
  author: {
    name: string;
    email: string;
    username?: string;
  };
  added: string[];
  removed: string[];
  modified: string[];
  url: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  merged: boolean;
  additions: number;
  deletions: number;
  changed_files: number;
  user: {
    login: string;
    id: number;
  };
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: 'completed' | 'in_progress' | 'queued';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped';
  run_started_at: string;
  updated_at: string;
  run_attempt: number;
}

export interface UserDocument {
  $id: string;
  github_id: string;
  username: string;
  email: string;
  avatar_url?: string;
  location?: string;
  preferences: string;
  github_tokens?: string;
  onboarding_completed: boolean;
  $createdAt: string;
  $updatedAt: string;
}

export interface ActivityDocument {
  $id: string;
  user_id: string;
  type: 'commit' | 'pr' | 'ci_run' | 'deployment' | 'local_dev';
  repository?: string;
  commit?: string;
  ci_data?: string;
  local_data?: string;
  carbon_kg: number;
  calculation_confidence: 'high' | 'medium' | 'low';
  timestamp: string;
  $createdAt: string;
}

export interface CalculationDocument {
  $id: string;
  activity_id: string;
  emission_factors: string;
  energy_breakdown: string;
  methodology_version: string;
  calculation_timestamp: string;
  raw_data: string;
  confidence_factors: string;
  $createdAt: string;
}

export interface LeaderboardDocument {
  $id: string;
  user_id: string;
  period_type: 'daily' | 'weekly' | 'monthly' | 'all_time';
  period_start: string;
  period_end: string;
  metrics: string;
  rank: number;
  total_participants: number;
  percentile: number;
  last_updated: string;
  $createdAt: string;
}

export interface EmissionFactorDocument {
  $id: string;
  region: string;
  factor_kg_co2_per_kwh: number;
  renewable_percentage: number;
  source: string;
  valid_from: string;
  valid_until: string;
  last_updated: string;
  confidence_rating: 'high' | 'medium' | 'low';
  $createdAt: string;
}