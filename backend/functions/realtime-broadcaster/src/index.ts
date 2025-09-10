/**
 * Real-time Broadcaster - Appwrite Function
 * Handles real-time broadcasting of events to connected clients
 * Processes carbon updates, activity updates, and leaderboard changes
 */

// Types
interface BroadcastInput {
  type: 'carbon_update' | 'activity_update' | 'leaderboard_update';
  userId?: string;
  activityId?: string;
  carbonKg?: number;
  confidence?: string;
  activityType?: string;
  repository?: string;
  periodType?: string;
  updatedUsers?: string[];
  timestamp: string;
}

interface AppwriteContext {
  req: any;
  res: any;
  log: (message: string) => void;
  error: (message: string) => void;
}

/**
 * Broadcast carbon calculation update
 */
async function broadcastCarbonUpdate(input: BroadcastInput, log: (msg: string) => void): Promise<void> {
  try {
    // This function would integrate with the real-time broadcasting service
    // For now, we simulate the broadcast by logging the event
    
    log(`Broadcasting carbon update: User ${input.userId}, Activity ${input.activityId}, Carbon ${input.carbonKg}kg, Confidence ${input.confidence}`);
    
    // In a full implementation, this would:
    // 1. Connect to WebSocket service
    // 2. Broadcast to user's carbon channel
    // 3. Update global statistics
    // 4. Trigger dashboard refreshes
    
    const broadcastData = {
      channel: `user.${input.userId}.carbon`,
      event: 'carbon.calculated',
      data: {
        user_id: input.userId,
        activity_id: input.activityId,
        carbon_kg: input.carbonKg,
        confidence: input.confidence,
        timestamp: input.timestamp
      }
    };
    
    log(`Would broadcast to channel: ${broadcastData.channel}`);
    
  } catch (error: any) {
    throw new Error(`Carbon update broadcast failed: ${error.message}`);
  }
}

/**
 * Broadcast activity creation update
 */
async function broadcastActivityUpdate(input: BroadcastInput, log: (msg: string) => void): Promise<void> {
  try {
    log(`Broadcasting activity update: User ${input.userId}, Activity ${input.activityId}, Type ${input.activityType}`);
    
    const broadcastData = {
      channel: `user.${input.userId}.activities`,
      event: 'activity.created',
      data: {
        user_id: input.userId,
        activity_id: input.activityId,
        activity_type: input.activityType,
        repository: input.repository,
        timestamp: input.timestamp
      }
    };
    
    log(`Would broadcast to channel: ${broadcastData.channel}`);
    
  } catch (error: any) {
    throw new Error(`Activity update broadcast failed: ${error.message}`);
  }
}

/**
 * Broadcast leaderboard update
 */
async function broadcastLeaderboardUpdate(input: BroadcastInput, log: (msg: string) => void): Promise<void> {
  try {
    log(`Broadcasting leaderboard update: Period ${input.periodType}, Updated users: ${input.updatedUsers?.length || 0}`);
    
    const broadcastData = {
      channel: `leaderboard.${input.periodType}`,
      event: 'leaderboard.updated',
      data: {
        period_type: input.periodType,
        updated_users: input.updatedUsers || [],
        timestamp: input.timestamp
      }
    };
    
    log(`Would broadcast to channel: ${broadcastData.channel}`);
    
  } catch (error: any) {
    throw new Error(`Leaderboard update broadcast failed: ${error.message}`);
  }
}

/**
 * Main function handler
 */
export default async function handler(context: AppwriteContext) {
  const { req, res, log, error } = context;
  
  try {
    const input: BroadcastInput = JSON.parse(req.body || '{}');
    
    if (!input.type || !input.timestamp) {
      error('Missing required broadcast parameters: type and timestamp');
      return res.json({ error: 'Missing required parameters' }, 400);
    }
    
    log(`Processing real-time broadcast: ${input.type}`);
    
    // Route to appropriate broadcast handler
    switch (input.type) {
      case 'carbon_update':
        if (!input.userId || !input.activityId || input.carbonKg === undefined) {
          error('Missing required carbon update parameters');
          return res.json({ error: 'Missing carbon update parameters' }, 400);
        }
        await broadcastCarbonUpdate(input, log);
        break;
        
      case 'activity_update':
        if (!input.userId || !input.activityId || !input.activityType) {
          error('Missing required activity update parameters');
          return res.json({ error: 'Missing activity update parameters' }, 400);
        }
        await broadcastActivityUpdate(input, log);
        break;
        
      case 'leaderboard_update':
        if (!input.periodType || !input.updatedUsers) {
          error('Missing required leaderboard update parameters');
          return res.json({ error: 'Missing leaderboard update parameters' }, 400);
        }
        await broadcastLeaderboardUpdate(input, log);
        break;
        
      default:
        error(`Unknown broadcast type: ${input.type}`);
        return res.json({ error: 'Unknown broadcast type' }, 400);
    }
    
    log(`Real-time broadcast completed: ${input.type}`);
    
    return res.json({
      success: true,
      broadcast_type: input.type,
      timestamp: input.timestamp,
      processed_at: new Date().toISOString()
    });
    
  } catch (err: any) {
    error(`Real-time broadcast failed: ${err.message}`);
    return res.json({
      error: 'Real-time broadcast failed',
      message: err.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
}