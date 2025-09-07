# EcoTrace Backend - Real-time Carbon Footprint Dashboard

A production-ready backend implementation for EcoTrace's real-time carbon footprint tracking system, built with Appwrite Cloud services.

## Architecture Overview

EcoTrace is a real-time carbon footprint tracker for developers that monitors development activities and calculates their environmental impact. The backend uses Appwrite Cloud for scalable infrastructure and real-time capabilities.

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Appwrite       │    │   External      │
│   (Remix)       │◄──►│   Cloud Services │◄──►│   APIs & Data   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                       │                       │
        ├─ Real-time UI         ├─ Database             ├─ GitHub API
        ├─ Dashboard            ├─ Authentication       ├─ EPA eGRID
        ├─ Carbon Analytics     ├─ Functions            ├─ AWS Carbon API
        └─ Leaderboards         ├─ Realtime             └─ Electricity Maps
                                └─ Storage
```

## Features

### ✅ Implemented Components

1. **GitHub Webhook Processing** - Captures development activities (commits, PRs, CI runs)
2. **Carbon Calculation Engine** - Converts activities to CO2 emissions with multiple methodologies
3. **Real-time Dashboard Updates** - Live carbon metrics via Appwrite Realtime
4. **Leaderboard System** - Rankings for daily, weekly, monthly, and all-time periods
5. **External API Integration** - Multi-source carbon data with fallback hierarchy
6. **Performance Optimization** - Caching, rate limiting, and circuit breakers
7. **Production Database Schema** - Optimized for 10K+ concurrent users

### 🔄 Data Flow

1. Developer commits code → GitHub webhook → Appwrite Function
2. Function processes metadata → Triggers carbon calculation
3. Calculation engine → Fetches emission factors → Calculates energy/carbon
4. Results stored → Real-time broadcast → Frontend updates instantly
5. Periodic leaderboard updates → Rankings calculated → Broadcast to all users

## Technology Stack

- **Backend Services**: Appwrite Cloud (Database, Auth, Functions, Realtime, Storage)
- **Functions Runtime**: Node.js 18 with TypeScript
- **External APIs**: GitHub, EPA eGRID, AWS Carbon API, Electricity Maps
- **Caching**: Multi-level caching with Redis support
- **Monitoring**: Structured logging with performance tracking

## Database Schema

### Collections Overview

```typescript
// Users - Developer profiles with GitHub integration
interface User {
  github_id: string;
  username: string;
  email: string;
  location?: { country: string; region?: string };
  preferences: UserPreferences;
  onboarding_completed: boolean;
}

// Activities - Development actions that generate carbon
interface Activity {
  user_id: string;
  type: 'commit' | 'pr' | 'ci_run' | 'deployment';
  carbon_kg: number;
  calculation_confidence: 'high' | 'medium' | 'low';
  timestamp: string;
  // Activity-specific data (commit, CI, etc.)
}

// Calculations - Audit trail for carbon calculations
interface Calculation {
  activity_id: string;
  emission_factors: EmissionFactorData;
  energy_breakdown: EnergyBreakdown;
  methodology_version: string;
  confidence_factors: ConfidenceMetrics;
}

// Leaderboards - Ranked performance metrics
interface LeaderboardEntry {
  user_id: string;
  period_type: 'daily' | 'weekly' | 'monthly' | 'all_time';
  rank: number;
  metrics: UserMetrics;
  percentile: number;
}

// Emission Factors - Regional carbon intensity data
interface EmissionFactor {
  region: RegionData;
  factor_kg_co2_per_kwh: number;
  renewable_percentage: number;
  source: DataSource;
  confidence_rating: 'high' | 'medium' | 'low';
}
```

## Appwrite Functions

### 1. GitHub Webhook Processor (`/functions/github-webhook`)

Processes GitHub webhooks for development activities:

- **Push events**: Extracts commit metadata, estimates line changes
- **Pull request events**: Tracks PR lifecycle and code review impact
- **Workflow runs**: Captures CI/CD energy consumption with precise timing
- **Security**: Webhook signature verification, rate limiting

**Triggers**: GitHub webhook events
**Runtime**: Node.js 18, 15s timeout
**Permissions**: Create activities, trigger calculations

### 2. Carbon Calculator (`/functions/carbon-calculator`)

Core calculation engine with production-grade methodology:

- **Multi-source emission factors**: Electricity Maps → AWS Carbon → EPA eGRID → Cached
- **Activity-specific algorithms**: Different calculations for commits, CI runs, PRs
- **Confidence scoring**: Data quality assessment with audit trails  
- **Performance optimized**: Sub-500ms calculations with caching

**Methodology**: 
- Compute energy based on lines changed, CI runtime, complexity metrics
- Network energy for git operations and artifact transfers
- Storage operations for reads/writes with realistic multipliers
- Data center PUE and cooling overhead calculations

**Triggers**: Activity creation, manual recalculation
**Runtime**: Node.js 18, 30s timeout
**Permissions**: Read activities, write calculations, update activities

### 3. Leaderboard Updater (`/functions/leaderboard-updater`)

Periodic ranking calculation for gamification:

- **Multiple time periods**: Daily, weekly, monthly, all-time rankings
- **Efficiency scoring**: Carbon per line of code, carbon per commit
- **Scalable processing**: Handles 100K+ activities efficiently
- **Real-time broadcasts**: Updates pushed to connected clients

**Metrics**:
- Total carbon footprint (kg CO2e)
- Carbon efficiency (CO2/line of code)
- Active development days
- Commit frequency and productivity

**Schedule**: Every 6 hours
**Runtime**: Node.js 18, 60s timeout
**Permissions**: Read activities, write leaderboards, broadcast updates

### 4. API Integration Service (`/functions/api-integrations`)

External carbon data fetching with robust error handling:

- **Multi-source hierarchy**: Electricity Maps (real-time) → AWS Carbon → EPA eGRID → Cache
- **Circuit breaker pattern**: Automatic failover when APIs are down
- **Geographic coverage**: Global regions with intelligent fallbacks
- **Cache management**: 6-hour TTL with automatic refresh

**APIs Supported**:
- **Electricity Maps**: Real-time grid carbon intensity (250+ regions)
- **AWS Carbon API**: Regional cloud provider emissions
- **EPA eGRID**: US grid emissions data (authoritative)
- **Cached fallbacks**: Global averages when APIs unavailable

**Triggers**: Manual calls, cache refresh, emission factor requests
**Runtime**: Node.js 18, 30s timeout
**Permissions**: Read/write emission factors, external API access

## Real-time System

### Appwrite Realtime Integration

```typescript
// Real-time channels for live updates
const CHANNELS = {
  USER_CARBON: (userId) => `user.${userId}.carbon`,
  USER_ACTIVITIES: (userId) => `user.${userId}.activities`, 
  LEADERBOARD_DAILY: 'leaderboard.daily',
  LEADERBOARD_WEEKLY: 'leaderboard.weekly',
  ACTIVITIES_GLOBAL: 'activities.global'
};

// Auto-broadcasting on database changes
- Activity created → Broadcast to user channel
- Carbon calculated → Broadcast to user + global channels  
- Leaderboard updated → Broadcast to leaderboard channels
- Real-time dashboard updates with <500ms latency
```

### Performance Specifications

- **Target**: 10,000 concurrent users during demo
- **Throughput**: 100,000 GitHub webhook events/day
- **Latency**: <500ms real-time dashboard updates
- **Database**: Optimized queries with proper indexing
- **Caching**: Multi-level with Redis support

## Security & Compliance

### Authentication & Authorization
- OAuth 2.0 GitHub integration for user authentication
- Document-level permissions in Appwrite database
- Webhook signature verification for GitHub events
- API key rotation and secure storage

### Data Protection
- Encryption at rest and in transit (Appwrite Cloud)
- No sensitive data in logs or client responses
- GDPR compliance with user data controls
- Audit trails for all carbon calculations

### Input Validation & Rate Limiting
- Joi schema validation for all API inputs
- Rate limiting per user and IP address
- Circuit breakers for external API protection
- Input sanitization to prevent injection attacks

## Development Setup

### Prerequisites
```bash
# Required tools
node >= 18.0.0
npm >= 9.0.0
appwrite-cli >= 4.1.0

# External API keys (optional, fallbacks available)
GitHub App credentials
Electricity Maps API key  
EPA eGRID API access
AWS Carbon API credentials
```

### Installation & Configuration

1. **Clone and install dependencies**:
```bash
git clone <repository>
cd ecotrace-backend
npm install
```

2. **Environment setup**:
```bash
cp .env.example .env
# Configure your API keys and Appwrite credentials
```

3. **Deploy Appwrite resources**:
```bash
# Deploy database schema and functions
npm run deploy

# Alternative: Manual setup
appwrite deploy --all
```

4. **Development mode**:
```bash
# Start with auto-rebuild
npm run dev

# Build production version
npm run build
```

### Environment Variables

```bash
# Appwrite Configuration  
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-server-api-key
APPWRITE_DATABASE_ID=ecotrace-main

# GitHub Integration
GITHUB_CLIENT_ID=your-github-app-id
GITHUB_CLIENT_SECRET=your-github-app-secret  
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# External Carbon APIs (optional)
EPA_EGRID_API_KEY=your-epa-api-key
AWS_CARBON_API_KEY=your-aws-api-key
ELECTRICITY_MAPS_API_KEY=your-electricity-maps-key

# Performance & Caching
REDIS_URL=redis://localhost:6379 (optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Monitoring & Observability  

### Structured Logging
- JSON-formatted logs for production aggregation
- Performance metrics with duration and memory usage
- Error tracking with full stack traces and context
- Real-time event broadcasting logs

### Performance Monitoring
```typescript
// Built-in performance tracking
const monitor = performanceMonitor.start('operation-name');
// ... perform operation
const metrics = monitor.end();
// Automatic logging of duration, memory, CPU usage
```

### Health Checks & Metrics
- Database connection health
- External API connectivity status
- Cache hit rates and performance
- Function execution metrics
- Real-time subscriber counts

## Production Deployment

### Appwrite Cloud Setup

1. **Create Appwrite project** at https://cloud.appwrite.io
2. **Configure authentication** with GitHub OAuth
3. **Deploy database schema** using `appwrite.json` configuration
4. **Deploy functions** with proper environment variables
5. **Set up webhooks** for GitHub integration

### Scaling Considerations

- **Database indexes** optimized for query patterns
- **Function concurrency** configured per workload
- **Cache layers** for frequently accessed data
- **Rate limiting** to prevent abuse
- **Circuit breakers** for external API resilience

### Monitoring Production

```bash
# View function logs
appwrite logs --function-id=github-webhook

# Monitor database performance  
appwrite databases list-documents --queries='["orderDesc(\"\$createdAt\")", "limit(10)"]'

# Check real-time subscriptions
# (Monitor through Appwrite console)
```

## API Documentation

### Key Endpoints (via Appwrite Functions)

#### GitHub Webhook Processing
```
POST /v1/functions/github-webhook/executions
Content-Type: application/json  
X-GitHub-Event: push|pull_request|workflow_run
X-Hub-Signature-256: sha256=...

Body: GitHub webhook payload
```

#### Manual Carbon Calculation
```
POST /v1/functions/carbon-calculator/executions
Content-Type: application/json

{
  "activity_id": "string",
  "user_id": "string", 
  "activity_type": "commit|pr|ci_run",
  "commit_data": { /* commit metadata */ }
}
```

#### Emission Factors API
```
POST /v1/functions/api-integrations/executions
Content-Type: application/json

{
  "action": "fetch_emission_factors",
  "region": {
    "country": "US",
    "state_province": "CA"
  }
}
```

## Contributing

### Code Standards
- TypeScript with strict mode enabled
- ESLint + Prettier for code formatting  
- Comprehensive error handling with structured logging
- Performance monitoring for all operations
- Security-first approach with input validation

### Testing Strategy
- Unit tests for calculation algorithms
- Integration tests for Appwrite functions
- Load testing for performance validation
- Security testing for authentication flows

### Deployment Process
1. Local development and testing
2. Deploy to staging Appwrite project
3. Integration testing with real GitHub webhooks
4. Performance validation under load
5. Production deployment with monitoring

## License

MIT License - See LICENSE file for details

## Support

For technical issues:
1. Check Appwrite function logs for errors
2. Verify environment variable configuration
3. Test external API connectivity
4. Monitor database performance and indexing
5. Review real-time connection status

For questions or contributions, please open an issue or submit a pull request.