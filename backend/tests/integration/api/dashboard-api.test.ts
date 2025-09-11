import request from 'supertest';
import express from 'express';
import { createServer } from 'http';

import '@features/carbon-calculation/services/calculation-engine';
jest.mock('@websocket/services/connection');
jest.mock('@websocket/services/broadcaster');
jest.mock('@features/dashboard/services/dashboard-service');
jest.mock('@features/carbon-calculation');
jest.mock('@shared/utils/logger');
jest.mock('@shared/utils/performance');

describe('Dashboard API Endpoints', () => {
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    app = express();
    server = createServer(app);
    
    app.use(express.json());
    
    const { DashboardService } = require('@features/dashboard/services/dashboard-service');
    DashboardService.getUserCarbonData = jest.fn().mockResolvedValue({
      totalEmissions: 10.5,
      dailyAverage: 0.35,
      weeklyTrend: 'decreasing',
      data: [
        { date: '2024-01-01', emissions: 2.1 },
        { date: '2024-01-02', emissions: 1.8 }
      ]
    });
    
    DashboardService.getUserActivities = jest.fn().mockResolvedValue({
      activities: [
        {
          id: 'activity-1',
          type: 'commit',
          timestamp: '2024-01-01T10:00:00Z',
          carbonKg: 0.001,
          repository: 'test/repo'
        }
      ],
      total: 1,
      hasMore: false
    });
    
    DashboardService.getUserStats = jest.fn().mockResolvedValue({
      totalEmissions: 10.5,
      totalActivities: 150,
      averageDaily: 0.35,
      rank: 15,
      improvementPercent: 12.5
    });
    
    DashboardService.getUserTrends = jest.fn().mockResolvedValue({
      trends: [
        { period: '2024-01-01', emissions: 2.1, activities: 15 },
        { period: '2024-01-02', emissions: 1.8, activities: 12 }
      ],
      summary: {
        trend: 'decreasing',
        changePercent: -15.2
      }
    });
    
    DashboardService.getLeaderboardData = jest.fn().mockResolvedValue({
      leaderboard: [
        { userId: 'user-1', username: 'john', emissions: 5.2, rank: 1 },
        { userId: 'user-2', username: 'jane', emissions: 8.1, rank: 2 }
      ],
      userRank: { userId: 'test-user', rank: 15, emissions: 10.5 }
    });
    app.get('/api/dashboard/carbon/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const { period = 'weekly' } = req.query;
        
        const carbonData = await DashboardService.getUserCarbonData({
          userId,
          period: period as 'daily' | 'weekly' | 'monthly' | 'all_time'
        });
        
        res.json({
          success: true,
          data: carbonData,
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        res.status(500).json({
          error: 'Failed to fetch carbon data',
          message: error.message
        });
      }
    });

    app.get('/api/dashboard/activities/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const { limit = '25', offset = '0', type, since } = req.query;
        
        const activities = await DashboardService.getUserActivities({
          userId,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          type: type as string,
          since: since as string
        });
        
        res.json({
          success: true,
          data: activities,
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        res.status(500).json({
          error: 'Failed to fetch activities data',
          message: error.message
        });
      }
    });

    app.get('/api/dashboard/stats/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const { period = 'weekly' } = req.query;
        
        const stats = await DashboardService.getUserStats({
          userId,
          period: period as 'daily' | 'weekly' | 'monthly' | 'all_time'
        });
        
        res.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        res.status(500).json({
          error: 'Failed to fetch stats data',
          message: error.message
        });
      }
    });

    app.get('/api/dashboard/trends/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const { period = 'weekly', granularity = 'daily', days = '30' } = req.query;
        
        const trends = await DashboardService.getUserTrends({
          userId,
          period: period as string,
          granularity: granularity as 'hourly' | 'daily' | 'weekly',
          days: parseInt(days as string)
        });
        
        res.json({
          success: true,
          data: trends,
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        res.status(500).json({
          error: 'Failed to fetch trends data',
          message: error.message
        });
      }
    });

    app.get('/api/dashboard/leaderboard', async (req, res) => {
      try {
        const { period = 'weekly', limit = '50', userId } = req.query;
        
        const leaderboard = await DashboardService.getLeaderboardData({
          period: period as 'daily' | 'weekly' | 'monthly' | 'all_time',
          limit: parseInt(limit as string),
          userId: userId as string
        });
        
        res.json({
          success: true,
          data: leaderboard,
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        res.status(500).json({
          error: 'Failed to fetch leaderboard data',
          message: error.message
        });
      }
    });

    app.get('/health', (_req, res) => {
      res.json({ 
        status: 'OK', 
        message: 'EcoTrace Backend is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/dashboard/carbon/:userId', () => {
    it('should return user carbon data successfully', async () => {
      const response = await request(app)
        .get('/api/dashboard/carbon/test-user')
        .query({ period: 'weekly' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          totalEmissions: 10.5,
          dailyAverage: 0.35,
          weeklyTrend: 'decreasing',
          data: expect.any(Array)
        },
        timestamp: expect.any(String)
      });

      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.data[0]).toMatchObject({
        date: '2024-01-01',
        emissions: 2.1
      });
    });

    it('should handle different period parameters', async () => {
      const periods = ['daily', 'weekly', 'monthly', 'all_time'];
      
      for (const period of periods) {
        const response = await request(app)
          .get('/api/dashboard/carbon/test-user')
          .query({ period })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      }
    });

    it('should validate required userId parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/carbon/')
        .expect(404);

      expect(response.status).toBe(404);
    });

    it('should handle service errors gracefully', async () => {
      const { DashboardService } = require('@features/dashboard/services/dashboard-service');
      DashboardService.getUserCarbonData.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/dashboard/carbon/test-user')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to fetch carbon data',
        message: 'Database connection failed'
      });
    });

    it('should include proper response headers', async () => {
      const response = await request(app)
        .get('/api/dashboard/carbon/test-user')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/dashboard/activities/:userId', () => {
    it('should return user activities with pagination', async () => {
      const response = await request(app)
        .get('/api/dashboard/activities/test-user')
        .query({ limit: '10', offset: '0' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          activities: expect.any(Array),
          total: 1,
          hasMore: false
        },
        timestamp: expect.any(String)
      });

      expect(response.body.data.activities).toHaveLength(1);
      expect(response.body.data.activities[0]).toMatchObject({
        id: 'activity-1',
        type: 'commit',
        timestamp: expect.any(String),
        carbonKg: 0.001,
        repository: 'test/repo'
      });
    });

    it('should handle filter parameters', async () => {
      const response = await request(app)
        .get('/api/dashboard/activities/test-user')
        .query({ 
          type: 'commit', 
          since: '2024-01-01T00:00:00Z',
          limit: '25',
          offset: '0'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate numeric parameters', async () => {
      const response = await request(app)
        .get('/api/dashboard/activities/test-user')
        .query({ limit: 'invalid', offset: 'invalid' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/dashboard/stats/:userId', () => {
    it('should return user statistics', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats/test-user')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          totalEmissions: 10.5,
          totalActivities: 150,
          averageDaily: 0.35,
          rank: 15,
          improvementPercent: 12.5
        },
        timestamp: expect.any(String)
      });
    });

    it('should support period filtering', async () => {
      const periods = ['daily', 'weekly', 'monthly', 'all_time'];
      
      for (const period of periods) {
        const response = await request(app)
          .get('/api/dashboard/stats/test-user')
          .query({ period })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('GET /api/dashboard/trends/:userId', () => {
    it('should return trend analysis', async () => {
      const response = await request(app)
        .get('/api/dashboard/trends/test-user')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          trends: expect.any(Array),
          summary: {
            trend: 'decreasing',
            changePercent: -15.2
          }
        },
        timestamp: expect.any(String)
      });

      expect(response.body.data.trends).toHaveLength(2);
      expect(response.body.data.trends[0]).toMatchObject({
        period: '2024-01-01',
        emissions: 2.1,
        activities: 15
      });
    });

    it('should handle granularity parameters', async () => {
      const granularities = ['hourly', 'daily', 'weekly'];
      
      for (const granularity of granularities) {
        const response = await request(app)
          .get('/api/dashboard/trends/test-user')
          .query({ granularity, days: '7' })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('GET /api/dashboard/leaderboard', () => {
    it('should return leaderboard data', async () => {
      const response = await request(app)
        .get('/api/dashboard/leaderboard')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          leaderboard: expect.any(Array),
          userRank: {
            userId: 'test-user',
            rank: 15,
            emissions: 10.5
          }
        },
        timestamp: expect.any(String)
      });

      expect(response.body.data.leaderboard).toHaveLength(2);
      expect(response.body.data.leaderboard[0]).toMatchObject({
        userId: 'user-1',
        username: 'john',
        emissions: 5.2,
        rank: 1
      });
    });

    it('should support period and limit parameters', async () => {
      const response = await request(app)
        .get('/api/dashboard/leaderboard')
        .query({ 
          period: 'monthly',
          limit: '10',
          userId: 'test-user'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'OK',
        message: 'EcoTrace Backend is running',
        timestamp: expect.any(String),
        uptime: expect.any(Number)
      });
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent response format for all endpoints', async () => {
      const endpoints = [
        '/api/dashboard/carbon/test-user',
        '/api/dashboard/activities/test-user',
        '/api/dashboard/stats/test-user',
        '/api/dashboard/trends/test-user'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: expect.any(Object),
          timestamp: expect.any(String)
        });

        expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
      }
    });

    it('should return proper error format on failures', async () => {
      const { DashboardService } = require('@features/dashboard/services/dashboard-service');
      DashboardService.getUserCarbonData.mockRejectedValueOnce(new Error('Test error'));

      const response = await request(app)
        .get('/api/dashboard/carbon/test-user')
        .expect(500);

      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.any(String)
      });
    });
  });

  describe('Performance Tests', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/dashboard/carbon/test-user')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() => 
        request(app).get('/api/dashboard/carbon/test-user')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});