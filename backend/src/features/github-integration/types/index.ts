import { Octokit } from '@octokit/rest';

// Core GitHub Integration Types
export interface GitHubConnection {
  $id: string;
  user_id: string;
  github_user_id: string;
  github_username: string;
  encrypted_access_token: string;
  token_scopes: string;
  token_expires_at?: string;
  last_used_at: string;
  is_active: boolean;
  $createdAt: string;
  $updatedAt: string;
}

export interface GitHubRepository {
  $id: string;
  connection_id: string;
  github_repo_id: number;
  name: string;
  full_name: string;
  owner_login: string;
  is_private: boolean;
  default_branch: string;
  primary_language?: string;
  tracking_enabled: boolean;
  webhook_id?: string;
  webhook_url?: string;
  last_activity_at?: string;
  last_synced_at?: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface GitHubWebhook {
  $id: string;
  repository_id: string;
  github_webhook_id: number;
  webhook_url: string;
  events: string; // JSON array of event types
  is_active: boolean;
  secret_hash: string;
  last_ping_at?: string;
  last_delivery_status?: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface GitHubOAuthState {
  $id: string;
  user_id: string;
  state: string;
  code_verifier: string;
  code_challenge: string;
  expires_at: string;
  used: boolean;
  $createdAt: string;
  $updatedAt: string;
}

export interface GitHubActivityEvent {
  $id: string;
  repository_id: string;
  user_id: string;
  event_type: GitHubEventType;
  github_event_id?: string;
  commit_sha?: string;
  branch_name?: string;
  raw_payload?: string; // JSON
  processing_status: ProcessingStatus;
  activity_id?: string; // Link to activities table
  error_message?: string;
  event_timestamp: string;
  processed_at?: string;
  $createdAt: string;
  $updatedAt: string;
}

// GitHub Event Types
export type GitHubEventType = 
  | 'push'
  | 'pull_request'
  | 'workflow_run'
  | 'deployment'
  | 'deployment_status'
  | 'check_run'
  | 'check_suite';

export type ProcessingStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'skipped';

// OAuth Configuration
export interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

// OAuth Flow Types
export interface OAuthInitiateRequest {
  userId: string;
}

export interface OAuthInitiateResponse {
  authUrl: string;
  state: string;
}

export interface OAuthCallbackRequest {
  code: string;
  state: string;
  userId: string;
}

export interface OAuthCallbackResponse {
  connection: GitHubConnection;
  repositories: GitHubRepository[];
}

// Repository Management Types
export interface RepositoryListResponse {
  repositories: GitHubRepositoryInfo[];
  total: number;
}

export interface GitHubRepositoryInfo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    id: number;
  };
  private: boolean;
  default_branch: string;
  language?: string;
  updated_at: string;
  permissions?: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
  };
  tracking_enabled?: boolean;
  webhook_installed?: boolean;
}

export interface EnableTrackingRequest {
  repositoryId: number;
  webhookEvents?: GitHubEventType[];
}

export interface EnableTrackingResponse {
  repository: GitHubRepository;
  webhook: GitHubWebhook;
}

export interface DisableTrackingRequest {
  repositoryId: number;
}

// Webhook Processing Types
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
  installation?: {
    id: number;
  };
  [key: string]: any;
}

export interface WebhookProcessingResult {
  success: boolean;
  activityId?: string;
  carbonKg?: number;
  errorMessage?: string;
  skipped?: boolean;
  skipReason?: string;
}

// Activity Processing Types
export interface CommitEventPayload extends GitHubWebhookPayload {
  commits?: GitHubCommitInfo[];
  head_commit?: GitHubCommitInfo;
  before: string;
  after: string;
  ref: string;
  compare: string;
}

export interface PullRequestEventPayload extends GitHubWebhookPayload {
  pull_request: {
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
    head: {
      sha: string;
      ref: string;
    };
    base: {
      sha: string;
      ref: string;
    };
  };
}

export interface WorkflowRunEventPayload extends GitHubWebhookPayload {
  workflow_run: {
    id: number;
    name: string;
    status: 'queued' | 'in_progress' | 'completed';
    conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
    created_at: string;
    updated_at: string;
    run_started_at?: string;
    run_attempt: number;
    head_sha: string;
    head_branch: string;
    jobs_url: string;
  };
}

export interface GitHubCommitInfo {
  id: string;
  message: string;
  timestamp: string;
  author: {
    name: string;
    email: string;
    username?: string;
  };
  committer: {
    name: string;
    email: string;
    username?: string;
  };
  added: string[];
  removed: string[];
  modified: string[];
  url: string;
}

// Carbon Calculation Integration Types
export interface GitHubActivityData {
  type: 'commit' | 'ci_run' | 'deployment' | 'pr';
  repository: {
    name: string;
    full_name: string;
    private: boolean;
    language?: string;
  };
  commit?: {
    sha: string;
    message: string;
    additions: number;
    deletions: number;
    changed_files: number;
    author: string;
  };
  ci_data?: {
    provider: 'github_actions';
    duration_seconds: number;
    success: boolean;
    runner_type: string;
    job_count?: number;
  };
  pr_data?: {
    number: number;
    additions: number;
    deletions: number;
    changed_files: number;
    merged: boolean;
  };
  metadata: Record<string, any>;
  timestamp: string;
}

// Security and Encryption Types
export interface EncryptedTokenData {
  encryptedToken: string;
  iv: string;
  authTag: string;
}

export interface TokenValidationResult {
  valid: boolean;
  scopes?: string[];
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
  errorMessage?: string;
}

// Service Response Types
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Integration Status Types
export interface IntegrationStatus {
  connected: boolean;
  connectionId?: string;
  githubUsername?: string;
  repositoriesCount: number;
  trackedRepositoriesCount: number;
  activeWebhooksCount: number;
  lastActivity?: string;
  tokenValid: boolean;
  permissions: string[];
}

// Webhook Security Types
export interface WebhookSignatureValidation {
  valid: boolean;
  payload?: GitHubWebhookPayload;
  errorMessage?: string;
}

// Rate Limiting Types
export interface GitHubRateLimit {
  core: {
    limit: number;
    remaining: number;
    reset: number;
    used: number;
  };
  search: {
    limit: number;
    remaining: number;
    reset: number;
    used: number;
  };
  graphql: {
    limit: number;
    remaining: number;
    reset: number;
    used: number;
  };
}

// Error Types
export class GitHubIntegrationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(code: string, message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'GitHubIntegrationError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class GitHubOAuthError extends GitHubIntegrationError {
  constructor(message: string, details?: any) {
    super('GITHUB_OAUTH_ERROR', message, 401, details);
    this.name = 'GitHubOAuthError';
  }
}

export class GitHubWebhookError extends GitHubIntegrationError {
  constructor(message: string, statusCode: number = 400, details?: any) {
    super('GITHUB_WEBHOOK_ERROR', message, statusCode, details);
    this.name = 'GitHubWebhookError';
  }
}

export class GitHubAPIError extends GitHubIntegrationError {
  constructor(message: string, statusCode: number = 500, details?: any) {
    super('GITHUB_API_ERROR', message, statusCode, details);
    this.name = 'GitHubAPIError';
  }
}

// Constants
export const GITHUB_OAUTH_SCOPES = [
  'repo:status',
  'read:repo_hook',
  'write:repo_hook',
  'read:org'
] as const;

export const WEBHOOK_EVENTS = [
  'push',
  'pull_request',
  'workflow_run',
  'deployment',
  'deployment_status'
] as const;

export const GITHUB_API_BASE_URL = 'https://api.github.com';
export const GITHUB_OAUTH_URL = 'https://github.com/login/oauth';

// Type guards
export function isCommitEvent(payload: GitHubWebhookPayload): payload is CommitEventPayload {
  return 'commits' in payload || 'head_commit' in payload;
}

export function isPullRequestEvent(payload: GitHubWebhookPayload): payload is PullRequestEventPayload {
  return 'pull_request' in payload;
}

export function isWorkflowRunEvent(payload: GitHubWebhookPayload): payload is WorkflowRunEventPayload {
  return 'workflow_run' in payload;
}

// Utility types for Octokit
export type OctokitInstance = InstanceType<typeof Octokit>;
export type RestEndpointMethodTypes = Octokit['rest'];