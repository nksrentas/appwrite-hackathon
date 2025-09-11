# GitHub Integration Backend API Requirements

This document outlines the required API endpoints for the GitHub integration frontend implementation.

## Base URL
All GitHub integration endpoints should be under: `/api/v1/integrations/github`

## Authentication
All endpoints require user authentication via session cookies or JWT tokens.

## Required API Endpoints

### 1. OAuth Flow

#### `POST /oauth/initiate`
Initiate GitHub OAuth flow
- **Request:** `{}`
- **Response:** 
```json
{
  "authUrl": "https://github.com/login/oauth/authorize?...",
  "state": "secure-random-state-string"
}
```

#### `POST /oauth/callback`
Handle OAuth callback from GitHub
- **Request:** 
```json
{
  "code": "github-oauth-code",
  "state": "state-from-initiate"
}
```
- **Response:** `GitHubConnection` object

#### `GET /oauth/validate/:state`
Validate OAuth state
- **Response:** `GitHubOAuthState` object or 404

### 2. Connection Management

#### `GET /connection`
Get current GitHub connection
- **Response:** `GitHubConnection` object or 404

#### `DELETE /connection`
Disconnect GitHub account
- **Response:** `{ "success": true }`

#### `POST /connection/refresh`
Refresh GitHub connection
- **Response:** Updated `GitHubConnection` object

### 3. Repository Management

#### `GET /repositories`
Get user repositories
- **Query Parameters:**
  - `page?: number` (default: 1)
  - `per_page?: number` (default: 50)
  - `visibility?: 'all' | 'public' | 'private'` (default: 'all')
  - `affiliation?: 'owner' | 'collaborator' | 'organization_member'`
  - `sort?: 'created' | 'updated' | 'pushed' | 'full_name'` (default: 'updated')
  - `direction?: 'asc' | 'desc'` (default: 'desc')
- **Response:**
```json
{
  "repositories": [GitHubRepository],
  "pagination": {
    "page": 1,
    "perPage": 50,
    "total": 150,
    "hasNext": true
  }
}
```

#### `POST /repositories/tracking`
Enable tracking for repositories
- **Request:** 
```json
{
  "repositoryIds": [12345, 67890]
}
```
- **Response:** `{ "success": true }`

#### `DELETE /repositories/tracking`
Disable tracking for repositories
- **Request:** 
```json
{
  "repositoryIds": [12345, 67890]
}
```
- **Response:** `{ "success": true }`

#### `GET /repositories/:id`
Get repository details
- **Response:** `GitHubRepository` object

#### `POST /repositories/:id/sync`
Manually sync repository data
- **Response:** `{ "success": true }`

### 4. Activity Tracking

#### `GET /activities`
Get GitHub activities
- **Query Parameters:**
  - `repository_id?: number`
  - `type?: string`
  - `limit?: number` (default: 50)
  - `offset?: number` (default: 0)
  - `start_date?: ISO date string`
  - `end_date?: ISO date string`
- **Response:** `GitHubActivity[]`

#### `GET /repositories/:id/activities`
Get activities for specific repository
- **Query Parameters:**
  - `limit?: number` (default: 50)
  - `offset?: number` (default: 0)
  - `type?: string`
- **Response:** `GitHubActivity[]`

### 5. Health & Monitoring

#### `GET /health`
Get integration health status
- **Response:** `GitHubIntegrationHealth` object

#### `GET /permissions`
Get permission scopes
- **Response:** `GitHubPermissionScope[]`

#### `POST /webhooks/test`
Test webhook endpoints
- **Response:**
```json
[{
  "repositoryId": 12345,
  "status": "success" | "error",
  "message": "Webhook test result"
}]
```

## Data Models

### GitHubConnection
```typescript
{
  "id": "string",
  "userId": "string",
  "githubUserId": "string",
  "githubUsername": "string", 
  "githubAvatarUrl": "string",
  "scopes": ["string"],
  "isActive": boolean,
  "connectedAt": "ISO date string",
  "lastSyncAt": "ISO date string" | null,
  "connectionHealth": "healthy" | "warning" | "error",
  "totalRepositories": number,
  "trackedRepositories": number
}
```

### GitHubRepository
```typescript
{
  "id": number,
  "name": "string",
  "fullName": "string",
  "description": "string" | null,
  "private": boolean,
  "language": "string" | null,
  "defaultBranch": "string",
  "stargazersCount": number,
  "forksCount": number,
  "size": number,
  "lastPushAt": "ISO date string",
  "isOwner": boolean,
  "permissions": {
    "admin": boolean,
    "maintain": boolean,
    "push": boolean,
    "triage": boolean,
    "pull": boolean
  },
  "owner": {
    "login": "string",
    "type": "User" | "Organization",
    "avatarUrl": "string"
  },
  "trackingEnabled": boolean,
  "webhookStatus": "active" | "inactive" | "error" | null,
  "lastActivity": "ISO date string" | null
}
```

### GitHubActivity
```typescript
{
  "id": "string",
  "repositoryId": number,
  "repositoryName": "string",
  "type": "push" | "pull_request" | "workflow_run" | "deployment" | "release",
  "action": "string",
  "actor": {
    "login": "string",
    "avatarUrl": "string"
  },
  "timestamp": "ISO date string",
  "metadata": {
    "commitSha"?: "string",
    "branch"?: "string",
    "commitCount"?: number,
    "filesChanged"?: number,
    "workflowName"?: "string",
    "conclusion"?: "string",
    "durationMs"?: number,
    "environment"?: "string"
  },
  "carbonImpact": {
    "co2Grams": number,
    "calculatedAt": "ISO date string"
  } | null
}
```

### GitHubIntegrationHealth
```typescript
{
  "connectionStatus": "connected" | "disconnected" | "error",
  "lastSyncAt": "ISO date string" | null,
  "webhooksHealthy": number,
  "webhooksTotal": number,
  "recentErrors": [{
    "error": "string",
    "timestamp": "ISO date string",
    "repositoryId"?: number
  }],
  "apiRateLimit": {
    "remaining": number,
    "total": number,
    "resetAt": "ISO date string"
  }
}
```

## Security Considerations

1. **OAuth Security:**
   - Use PKCE (Proof Key for Code Exchange) for OAuth flow
   - Validate state parameter to prevent CSRF attacks
   - Securely store and encrypt access tokens

2. **Webhook Security:**
   - Verify webhook signatures using GitHub webhook secret
   - Implement proper webhook payload validation
   - Use HTTPS for all webhook endpoints

3. **API Rate Limiting:**
   - Implement proper rate limiting for GitHub API calls
   - Cache frequently accessed data
   - Handle rate limit errors gracefully

4. **Data Privacy:**
   - Only store necessary repository metadata
   - Never store actual source code content
   - Implement proper data retention policies

## Error Handling

All endpoints should return consistent error responses:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details"?: {}
}
```

Common error codes:
- `GITHUB_CONNECTION_FAILED`
- `GITHUB_TOKEN_EXPIRED`
- `REPOSITORY_NOT_FOUND`
- `WEBHOOK_CREATION_FAILED`
- `RATE_LIMIT_EXCEEDED`

## Webhook Implementation

Backend should handle these GitHub webhook events:
- `push` - Code pushes to repositories
- `pull_request` - Pull request activities
- `workflow_run` - CI/CD workflow executions
- `deployment` - Deployment events
- `deployment_status` - Deployment status updates

Each webhook should:
1. Verify the payload signature
2. Extract relevant activity data
3. Calculate carbon impact
4. Store activity in database
5. Emit real-time updates if applicable