import { Router, Request, Response } from 'express';
import { logger } from '../utils/logging-utils';
import { PerformanceMonitor } from '../utils/performance-monitor';
import { DashboardService } from '../services/dashboard-service';
import { realtimeBroadcaster } from '../services/realtime-service';

export const dashboardRouter = Router();
const performanceMonitor = new PerformanceMonitor();

dashboardRouter.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    performanceMonitor.recordApiCall(req.path, duration);
    
    if (duration > 500) {
      logger.warn('Slow dashboard API response', {
        path: req.path,
        method: req.method,
        duration: `${duration}ms`,
        metadata: { threshold: 500 }
      });
    }
  });
  
  next();
});

dashboardRouter.get('/carbon/:userId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.params;
    const { period = 'weekly' } = req.query;
    
    logger.info('Dashboard carbon data requested', {
      userId,
      period: period as string,
      metadata: { endpoint: '/carbon' }
    });
    
    const carbonData = await DashboardService.getUserCarbonData({
      userId,
      period: period as 'daily' | 'weekly' | 'monthly' | 'all_time'
    });
    
    const responseTime = Date.now() - startTime;
    
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    res.json({
      success: true,
      data: carbonData,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });
    
  } catch (error: any) {
    logger.error('Dashboard carbon data request failed', {
      error: {
        message: error.message,
        code: 'CARBON_DATA_ERROR',
        stack: error.stack
      },
      metadata: { userId: req.params.userId }
    });
    
    res.status(500).json({
      error: 'Failed to fetch carbon data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

dashboardRouter.get('/activities/:userId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.params;
    const { 
      limit = '25', 
      offset = '0', 
      type,
      since 
    } = req.query;
    
    logger.info('Dashboard activities requested', {
      userId,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      type: type as string | undefined,
      since: since as string | undefined,
      metadata: { endpoint: '/activities' }
    });
    
    const activities = await DashboardService.getUserActivities({
      userId,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      type: type as string,
      since: since as string
    });
    
    const responseTime = Date.now() - startTime;
    
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    res.json({
      success: true,
      data: activities,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });
    
  } catch (error: any) {
    logger.error('Dashboard activities request failed', {
      error: {
        message: error.message,
        code: 'ACTIVITIES_DATA_ERROR',
        stack: error.stack
      },
      metadata: { userId: req.params.userId }
    });
    
    res.status(500).json({
      error: 'Failed to fetch activities data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

dashboardRouter.get('/stats/:userId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.params;
    const { period = 'weekly' } = req.query;
    
    logger.info('Dashboard stats requested', {
      userId,
      period: period as string,
      metadata: { endpoint: '/stats' }
    });
    
    const stats = await DashboardService.getUserStats({
      userId,
      period: period as 'daily' | 'weekly' | 'monthly' | 'all_time'
    });
    
    const responseTime = Date.now() - startTime;
    
    res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minute cache
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });
    
  } catch (error: any) {
    logger.error('Dashboard stats request failed', {
      error: {
        message: error.message,
        code: 'STATS_DATA_ERROR',
        stack: error.stack
      },
      metadata: { userId: req.params.userId }
    });
    
    res.status(500).json({
      error: 'Failed to fetch stats data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

dashboardRouter.get('/trends/:userId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.params;
    const { 
      period = 'weekly',
      granularity = 'daily',
      days = '30'
    } = req.query;
    
    logger.info('Dashboard trends requested', {
      userId,
      period: period as string,
      granularity: granularity as string,
      days: parseInt(days as string),
      metadata: { endpoint: '/trends' }
    });
    
    const trends = await DashboardService.getUserTrends({
      userId,
      period: period as string,
      granularity: granularity as 'hourly' | 'daily' | 'weekly',
      days: parseInt(days as string)
    });
    
    const responseTime = Date.now() - startTime;
    
    res.setHeader('Cache-Control', 'private, max-age=600'); // 10 minute cache
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    res.json({
      success: true,
      data: trends,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });
    
  } catch (error: any) {
    logger.error('Dashboard trends request failed', {
      error: {
        message: error.message,
        code: 'TRENDS_DATA_ERROR',
        stack: error.stack
      },
      metadata: { userId: req.params.userId }
    });
    
    res.status(500).json({
      error: 'Failed to fetch trends data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

dashboardRouter.get('/leaderboard', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { 
      period = 'weekly',
      limit = '50',
      userId 
    } = req.query;
    
    logger.info('Dashboard leaderboard requested', {
      period: period as string,
      limit: parseInt(limit as string),
      userId: userId as string | undefined,
      metadata: { endpoint: '/leaderboard' }
    });
    
    const leaderboard = await DashboardService.getLeaderboardData({
      period: period as 'daily' | 'weekly' | 'monthly' | 'all_time',
      limit: parseInt(limit as string),
      userId: userId as string
    });
    
    const responseTime = Date.now() - startTime;
    
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minute cache
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    res.json({
      success: true,
      data: leaderboard,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });
    
  } catch (error: any) {
    logger.error('Dashboard leaderboard request failed', {
      error: {
        message: error.message,
        code: 'LEADERBOARD_ERROR',
        stack: error.stack
      }
    });
    
    res.status(500).json({
      error: 'Failed to fetch leaderboard data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

dashboardRouter.post('/broadcast/test/:userId', async (req: Request, res: Response): Promise<any> => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  try {
    const { userId } = req.params;
    const { type = 'carbon_updated', data = {} } = req.body;
    
    logger.info('Test broadcast triggered', {
      userId,
      type,
      data,
      metadata: { endpoint: '/broadcast/test' }
    });
    
    if (type === 'carbon_updated') {
      await realtimeBroadcaster.broadcastCarbonUpdate({
        userId,
        activityId: data.activityId || 'test-activity',
        carbonKg: data.carbonKg || 0.123,
        confidence: data.confidence || 'medium'
      });
    }
    
    else if (type === 'activity_created') {
      await realtimeBroadcaster.broadcastActivityUpdate({
        userId,
        activityId: data.activityId || 'test-activity',
        activityType: data.activityType || 'commit',
        repository: data.repository || 'test/repo'
      });
    }
    else {
      return res.status(400).json({
        error: 'Invalid broadcast type',
        message: `Unknown type: ${type}. Supported types: carbon_updated, activity_created`
      });
    }
    
    res.json({
      success: true,
      message: 'Test broadcast sent',
      type,
      userId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('Test broadcast failed', {
      error: {
        code: 'BROADCAST_TEST_ERROR',
        message: error.message,
        stack: error.stack
      }
    });
    
    res.status(500).json({
      error: 'Test broadcast failed',
      message: error.message
    });
  }
});

dashboardRouter.get('/performance', async (_req: Request, res: Response) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch performance metrics',
      message: error.message
    });
  }
});