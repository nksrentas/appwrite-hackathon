import { Router, Request, Response } from 'express';
import { logger } from '@shared/utils/logger';
import { leaderboardService } from '../services/leaderboard-service';
import { challengeService } from '../services/challenge-service';
import { achievementEngine } from '../services/achievement-engine';
import { privacyManager } from '../services/privacy-manager';
import { 
  LeaderboardRequest, 
  ChallengeRequest, 
  AchievementRequest,
  PrivacyUpdateRequest 
} from '../types';

const router = Router();

// Leaderboard Routes
router.get('/leaderboards', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const request: LeaderboardRequest = {
      category: req.query.category as any,
      period: req.query.period as any,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      userId: req.query.userId as string,
      contextGroup: req.query.contextGroup as string
    };

    logger.info('Leaderboard request received', { 
      metadata: { request, endpoint: '/leaderboards' }
    });

    const response = await leaderboardService.getLeaderboard(request);
    const responseTime = Date.now() - startTime;

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });

  } catch (error: any) {
    logger.error('Leaderboard request failed', {
      error: {
        code: 'LEADERBOARD_API_ERROR',
        message: error.message,
        stack: error.stack
      },
      metadata: { endpoint: '/leaderboards' }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/leaderboards/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await leaderboardService.getLeaderboardCategories();
    
    res.json({
      success: true,
      data: categories,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard categories',
      message: error.message
    });
  }
});

router.get('/leaderboards/periods', async (_req: Request, res: Response) => {
  try {
    const periods = await leaderboardService.getAvailablePeriods();
    
    res.json({
      success: true,
      data: periods,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard periods',
      message: error.message
    });
  }
});

router.get('/leaderboards/user/:userId/stats', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.params;

    const stats = await leaderboardService.getUserLeaderboardStats(userId);
    const responseTime = Date.now() - startTime;

    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });

  } catch (error: any) {
    logger.error('User leaderboard stats request failed', {
      error: { 
        code: 'USER_STATS_API_ERROR',
        message: error.message,
        stack: error.stack 
      },
      metadata: { userId: req.params.userId }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch user leaderboard stats',
      message: error.message
    });
  }
});

// Challenge Routes
router.get('/challenges', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const request: ChallengeRequest = {
      type: req.query.type as any,
      category: req.query.category as any,
      difficulty: req.query.difficulty as any,
      status: req.query.status as any,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      userId: req.query.userId as string
    };

    logger.info('Challenges request received', { 
      metadata: { request, endpoint: '/challenges' }
    });

    const response = await challengeService.getChallenges(request);
    const responseTime = Date.now() - startTime;

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });

  } catch (error: any) {
    logger.error('Challenges request failed', {
      error: {
        code: 'CHALLENGES_API_ERROR',
        message: error.message,
        stack: error.stack
      },
      metadata: { endpoint: '/challenges' }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch challenges',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/challenges/:challengeId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { challengeId } = req.params;
    const { userId } = req.query;

    const challenge = await challengeService.getChallengeById(challengeId, userId as string);
    
    if (!challenge) {
      res.status(404).json({
        success: false,
        error: 'Challenge not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const responseTime = Date.now() - startTime;

    res.setHeader('Cache-Control', 'public, max-age=600');
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    res.json({
      success: true,
      data: challenge,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });

  } catch (error: any) {
    logger.error('Challenge detail request failed', {
      error: { 
        code: 'CHALLENGE_DETAIL_API_ERROR',
        message: error.message,
        stack: error.stack 
      },
      metadata: { challengeId: req.params.challengeId }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch challenge',
      message: error.message
    });
  }
});

router.post('/challenges', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const challengeData = req.body;
    
    logger.info('Challenge creation request', {
      title: challengeData.title,
      type: challengeData.type
    });

    const challenge = await challengeService.createChallenge(challengeData);
    const responseTime = Date.now() - startTime;

    res.setHeader('X-Response-Time', `${responseTime}ms`);

    res.status(201).json({
      success: true,
      data: challenge,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });

  } catch (error: any) {
    logger.error('Challenge creation failed', {
      error: {
        code: 'CHALLENGE_CREATE_API_ERROR',
        message: error.message,
        stack: error.stack
      }
    });

    res.status(400).json({
      success: false,
      error: 'Failed to create challenge',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/challenges/:challengeId/join', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { challengeId } = req.params;
    const { userId, teamId } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const participant = await challengeService.joinChallenge(challengeId, userId, teamId);
    const responseTime = Date.now() - startTime;

    res.setHeader('X-Response-Time', `${responseTime}ms`);

    res.json({
      success: true,
      data: participant,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });

  } catch (error: any) {
    logger.error('Challenge join failed', {
      error: {
        code: 'CHALLENGE_JOIN_API_ERROR',
        message: error.message,
        stack: error.stack
      },
      metadata: { challengeId: req.params.challengeId }
    });

    const statusCode = error.message.includes('already participating') ? 409 :
                      error.message.includes('full') ? 409 :
                      error.message.includes('not found') ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      error: 'Failed to join challenge',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/challenges/:challengeId/leaderboard', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { challengeId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const leaderboard = await challengeService.getChallengeLeaderboard(challengeId, limit);
    const responseTime = Date.now() - startTime;

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    res.json({
      success: true,
      data: leaderboard,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });

  } catch (error: any) {
    logger.error('Challenge leaderboard request failed', {
      error: { 
        code: 'CHALLENGE_LEADERBOARD_API_ERROR',
        message: error.message,
        stack: error.stack 
      },
      metadata: { challengeId: req.params.challengeId }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch challenge leaderboard',
      message: error.message
    });
  }
});

router.get('/challenges/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await challengeService.getChallengeCategories();
    
    res.json({
      success: true,
      data: categories,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch challenge categories',
      message: error.message
    });
  }
});

// Achievement Routes
router.get('/achievements', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const request: AchievementRequest = {
      category: req.query.category as any,
      rarity: req.query.rarity as any,
      userId: req.query.userId as string,
      onlyUnlocked: req.query.onlyUnlocked === 'true'
    };

    logger.info('Achievements request received', { 
      metadata: { request, endpoint: '/achievements' }
    });

    const response = await achievementEngine.getAchievements(request);
    const responseTime = Date.now() - startTime;

    const cacheControl = request.userId ? 'private, max-age=300' : 'public, max-age=600';
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });

  } catch (error: any) {
    logger.error('Achievements request failed', {
      error: {
        code: 'ACHIEVEMENTS_API_ERROR',
        message: error.message,
        stack: error.stack
      },
      metadata: { endpoint: '/achievements' }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch achievements',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/achievements/user/:userId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.params;

    const userAchievements = await achievementEngine.getUserAchievements(userId);
    const responseTime = Date.now() - startTime;

    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    res.json({
      success: true,
      data: userAchievements,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });

  } catch (error: any) {
    logger.error('User achievements request failed', {
      error: { 
        code: 'USER_ACHIEVEMENTS_API_ERROR',
        message: error.message,
        stack: error.stack 
      },
      metadata: { userId: req.params.userId }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch user achievements',
      message: error.message
    });
  }
});

router.get('/achievements/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await achievementEngine.getAchievementCategories();
    
    res.json({
      success: true,
      data: categories,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch achievement categories',
      message: error.message
    });
  }
});

// Privacy Routes
router.get('/privacy/:userId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.params;

    const settings = await privacyManager.getPrivacySettings(userId);
    const responseTime = Date.now() - startTime;

    if (!settings) {
      const defaultSettings = await privacyManager.createDefaultPrivacySettings(userId);
      
      res.json({
        success: true,
        data: defaultSettings,
        timestamp: new Date().toISOString(),
        response_time_ms: responseTime
      });
      return;
    }

    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    res.json({
      success: true,
      data: settings,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });

  } catch (error: any) {
    logger.error('Privacy settings request failed', {
      error: { 
        code: 'PRIVACY_SETTINGS_API_ERROR',
        message: error.message,
        stack: error.stack 
      },
      metadata: { userId: req.params.userId }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch privacy settings',
      message: error.message
    });
  }
});

router.put('/privacy/:userId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.params;
    const updates: PrivacyUpdateRequest = req.body;

    logger.info('Privacy settings update request', { userId, metadata: { updates } });

    const updatedSettings = await privacyManager.updatePrivacySettings(userId, updates);
    const responseTime = Date.now() - startTime;

    res.setHeader('X-Response-Time', `${responseTime}ms`);

    res.json({
      success: true,
      data: updatedSettings,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });

  } catch (error: any) {
    logger.error('Privacy settings update failed', {
      error: {
        code: 'PRIVACY_UPDATE_API_ERROR',
        message: error.message,
        stack: error.stack
      },
      metadata: { userId: req.params.userId }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update privacy settings',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Developer Leaderboards API is healthy',
    timestamp: new Date().toISOString(),
    features: [
      'Privacy-first leaderboards',
      'Challenge management',
      'Achievement system',
      'Real-time updates',
      'Context-aware ranking'
    ]
  });
});

export default router;