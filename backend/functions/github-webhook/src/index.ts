/**
 * GitHub Webhook Processor - Appwrite Function
 * Processes GitHub webhooks for push, pull request, and workflow events
 * Extracts development activity metadata and triggers carbon calculations
 */

import { Client, Databases, Functions } from 'node-appwrite';
import { createHmac, timingSafeEqual } from 'crypto';

// Types
interface GitHubWebhookPayload {
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

interface GitHubCommit {
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

interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  user: {
    login: string;
    id: number;
  };
  created_at: string;
  updated_at: string;
  additions?: number;
  deletions?: number;
  changed_files?: number;
}

interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  run_attempt: number;
}

interface AppwriteContext {
  req: any;
  res: any;
  log: (message: string) => void;
  error: (message: string) => void;
}

// Initialize Appwrite client
function initializeAppwrite(): { databases: Databases; functions: Functions } {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

  return {
    databases: new Databases(client),
    functions: new Functions(client)
  };
}

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    const providedSignature = signature.replace('sha256=', '');
    
    return timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  } catch (error) {
    return false;
  }
}

/**
 * Find or create user from GitHub data
 */
async function findOrCreateUser(
  databases: Databases,
  githubUserId: number,
  username: string,
  email?: string
): Promise<string> {
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace-main';
  
  try {
    // Try to find existing user
    const existingUsers = await databases.listDocuments(
      databaseId,
      'users',
      [`equal("github_id", "${githubUserId}")`]
    );
    
    if (existingUsers.documents.length > 0) {
      return existingUsers.documents[0].$id;
    }
    
    // Create new user
    const newUser = await databases.createDocument(
      databaseId,
      'users',
      'unique()',
      {
        github_id: githubUserId.toString(),
        username,
        email: email || `${username}@github.local`,
        preferences: JSON.stringify({
          units: 'metric',
          privacy_level: 'public',
          notifications: true,
          methodology_detail: 'simple'
        }),
        onboarding_completed: false
      }
    );
    
    return newUser.$id;
  } catch (error) {
    throw new Error(`Failed to find or create user: ${error}`);
  }
}

/**
 * Calculate lines changed from GitHub commit data
 */
function calculateLinesChanged(commit: GitHubCommit): { additions: number; deletions: number } {
  // GitHub doesn't provide line counts in webhook payloads
  // We'll estimate based on files changed (this would be enhanced with GitHub API calls)
  const totalFiles = commit.added.length + commit.removed.length + commit.modified.length;
  
  // Rough estimation: average 10 lines per file for new/removed, 5 for modified
  const estimatedAdditions = (commit.added.length * 10) + (commit.modified.length * 5);
  const estimatedDeletions = (commit.removed.length * 10) + (commit.modified.length * 3);
  
  return {
    additions: estimatedAdditions,
    deletions: estimatedDeletions
  };
}

/**
 * Process push event
 */
async function processPushEvent(
  databases: Databases,
  functions: Functions,
  payload: GitHubWebhookPayload
): Promise<string[]> {
  const activityIds: string[] = [];
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace-main';
  
  if (!payload.commits || payload.commits.length === 0) {
    return activityIds;
  }
  
  for (const commit of payload.commits) {
    try {
      // Find or create user
      const userId = await findOrCreateUser(
        databases,
        payload.sender.id,
        payload.sender.login,
        commit.author.email
      );
      
      // Calculate estimated line changes
      const { additions, deletions } = calculateLinesChanged(commit);
      
      // Create activity record
      const activity = await databases.createDocument(
        databaseId,
        'activities',
        'unique()',
        {
          user_id: userId,
          type: 'commit',
          repository: JSON.stringify({
            name: payload.repository.name,
            full_name: payload.repository.full_name,
            private: payload.repository.private
          }),
          commit: JSON.stringify({
            sha: commit.id,
            message: commit.message,
            additions,
            deletions,
            changed_files: commit.added.length + commit.removed.length + commit.modified.length
          }),
          carbon_kg: 0, // Will be calculated by carbon-calculator function
          calculation_confidence: 'medium',
          timestamp: commit.timestamp || new Date().toISOString()
        }
      );
      
      activityIds.push(activity.$id);
      
      // Trigger carbon calculation
      await functions.createExecution(
        'carbon-calculator',
        JSON.stringify({
          activity_id: activity.$id,
          user_id: userId,
          activity_type: 'commit',
          commit_data: {
            sha: commit.id,
            message: commit.message,
            additions,
            deletions,
            changed_files: commit.added.length + commit.removed.length + commit.modified.length
          },
          repository: payload.repository
        })
      );
      
    } catch (error) {
      console.error(`Failed to process commit ${commit.id}:`, error);
    }
  }
  
  return activityIds;
}

/**
 * Process pull request event
 */
async function processPullRequestEvent(
  databases: Databases,
  functions: Functions,
  payload: GitHubWebhookPayload
): Promise<string | null> {
  if (!payload.pull_request || !['opened', 'synchronize', 'closed'].includes(payload.action!)) {
    return null;
  }
  
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace-main';
  const pr = payload.pull_request;
  
  try {
    // Find or create user
    const userId = await findOrCreateUser(
      databases,
      pr.user.id,
      pr.user.login
    );
    
    // Create activity record
    const activity = await databases.createDocument(
      databaseId,
      'activities',
      'unique()',
      {
        user_id: userId,
        type: 'pr',
        repository: JSON.stringify({
          name: payload.repository.name,
          full_name: payload.repository.full_name,
          private: payload.repository.private
        }),
        commit: JSON.stringify({
          sha: `pr-${pr.number}`,
          message: pr.title,
          additions: pr.additions || 0,
          deletions: pr.deletions || 0,
          changed_files: pr.changed_files || 0
        }),
        carbon_kg: 0,
        calculation_confidence: 'medium',
        timestamp: payload.action === 'closed' ? new Date().toISOString() : pr.created_at
      }
    );
    
    // Trigger carbon calculation
    await functions.createExecution(
      'carbon-calculator',
      JSON.stringify({
        activity_id: activity.$id,
        user_id: userId,
        activity_type: 'pr',
        pr_data: {
          number: pr.number,
          title: pr.title,
          additions: pr.additions || 0,
          deletions: pr.deletions || 0,
          changed_files: pr.changed_files || 0,
          action: payload.action
        },
        repository: payload.repository
      })
    );
    
    return activity.$id;
    
  } catch (error) {
    console.error(`Failed to process pull request ${pr.number}:`, error);
    return null;
  }
}

/**
 * Process workflow run event (CI/CD)
 */
async function processWorkflowRunEvent(
  databases: Databases,
  functions: Functions,
  payload: GitHubWebhookPayload
): Promise<string | null> {
  if (!payload.workflow_run || payload.action !== 'completed') {
    return null;
  }
  
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace-main';
  const workflow = payload.workflow_run;
  
  try {
    // Find or create user
    const userId = await findOrCreateUser(
      databases,
      payload.sender.id,
      payload.sender.login
    );
    
    // Calculate workflow duration
    const startTime = new Date(workflow.run_started_at).getTime();
    const endTime = new Date(workflow.updated_at).getTime();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);
    
    // Create activity record
    const activity = await databases.createDocument(
      databaseId,
      'activities',
      'unique()',
      {
        user_id: userId,
        type: 'ci_run',
        repository: JSON.stringify({
          name: payload.repository.name,
          full_name: payload.repository.full_name,
          private: payload.repository.private
        }),
        ci_data: JSON.stringify({
          provider: 'github_actions',
          duration_seconds: durationSeconds,
          success: workflow.conclusion === 'success',
          runner_type: 'standard', // Default, could be enhanced
          workflow_name: workflow.name,
          run_id: workflow.id
        }),
        carbon_kg: 0,
        calculation_confidence: 'high',
        timestamp: workflow.updated_at
      }
    );
    
    // Trigger carbon calculation
    await functions.createExecution(
      'carbon-calculator',
      JSON.stringify({
        activity_id: activity.$id,
        user_id: userId,
        activity_type: 'ci_run',
        ci_data: {
          provider: 'github_actions',
          duration_seconds: durationSeconds,
          success: workflow.conclusion === 'success',
          runner_type: 'standard',
          workflow_name: workflow.name,
          run_id: workflow.id
        },
        repository: payload.repository
      })
    );
    
    return activity.$id;
    
  } catch (error) {
    console.error(`Failed to process workflow run ${workflow.id}:`, error);
    return null;
  }
}

/**
 * Main webhook handler
 */
export default async function handler(context: AppwriteContext) {
  const { req, res, log, error } = context;
  
  try {
    // Get webhook data
    const signature = req.headers['x-hub-signature-256'];
    const eventType = req.headers['x-github-event'];
    const payload = req.body;
    
    if (!signature || !eventType) {
      error('Missing required GitHub webhook headers');
      return res.json({ error: 'Missing required headers' }, 400);
    }
    
    // Verify webhook signature
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret && !verifyGitHubSignature(JSON.stringify(payload), signature, webhookSecret)) {
      error('Invalid webhook signature');
      return res.json({ error: 'Invalid signature' }, 401);
    }
    
    log(`Processing GitHub webhook: ${eventType}`);
    
    // Initialize Appwrite services
    const { databases, functions } = initializeAppwrite();
    
    let result: any = null;
    let activityIds: string[] = [];
    
    // Process different event types
    switch (eventType) {
      case 'push':
        activityIds = await processPushEvent(databases, functions, payload);
        result = { processed_commits: activityIds.length, activity_ids: activityIds };
        break;
        
      case 'pull_request':
        const prActivityId = await processPullRequestEvent(databases, functions, payload);
        if (prActivityId) {
          activityIds = [prActivityId];
          result = { processed_pr: true, activity_id: prActivityId };
        }
        break;
        
      case 'workflow_run':
        const workflowActivityId = await processWorkflowRunEvent(databases, functions, payload);
        if (workflowActivityId) {
          activityIds = [workflowActivityId];
          result = { processed_workflow: true, activity_id: workflowActivityId };
        }
        break;
        
      default:
        log(`Unsupported event type: ${eventType}`);
        return res.json({ message: 'Event type not processed', event_type: eventType }, 200);
    }
    
    if (activityIds.length === 0) {
      log(`No activities created for ${eventType} event`);
      return res.json({ message: 'No activities processed', event_type: eventType }, 200);
    }
    
    log(`Successfully processed ${eventType} event: ${activityIds.length} activities created`);
    
    return res.json({
      success: true,
      event_type: eventType,
      activities_created: activityIds.length,
      result
    });
    
  } catch (err: any) {
    error(`Webhook processing failed: ${err.message}`);
    return res.json({ 
      error: 'Webhook processing failed',
      message: err.message 
    }, 500);
  }
}