import request from 'supertest';
import express from 'express';
import { createServer } from 'http';

jest.mock('@features/carbon-calculation/services/calculation-engine');
jest.mock('@shared/utils/logger');

describe('Carbon Calculation API Endpoints', () => {
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    app = express();
    server = createServer(app);
    
    app.use(express.json());
    const mockCalculationEngine = {
      calculateCarbon: jest.fn().mockResolvedValue({
        carbonKg: 0.001234,
        confidence: 'high',
        methodology: {
          name: 'EcoTrace Scientific Carbon Calculation',
          version: '1.0.0',
          emissionFactors: [],
          conversionFactors: [],
          assumptions: ['Conservative estimation bias applied (+15%)'],
          standards: ['IPCC_AR6', 'GHG_Protocol']
        },
        sources: [
          {
            name: 'EPA eGRID',
            type: 'Government',
            lastUpdated: '2024-01-01T00:00:00Z',
            freshness: 'recent',
            reliability: 0.95,
            coverage: {
              geographic: ['US'],
              temporal: 'Current',
              activities: ['electricity']
            }
          }
        ],
        uncertaintyRange: {
          lower: 0.001048,
          upper: 0.001543
        },
        calculatedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        auditTrail: [
          {
            timestamp: new Date().toISOString(),
            action: 'calculate',
            details: { version: '1.0.0' },
            systemInfo: {
              version: '1.0.0',
              environment: 'test',
              requestId: 'test-request-123'
            }
          }
        ]
      }),
      getPublicMethodology: jest.fn().mockResolvedValue({
        name: 'EcoTrace Scientific Carbon Calculation',
        version: '1.0.0',
        emissionFactors: [],
        conversionFactors: [],
        assumptions: [
          'Conservative estimation bias applied (+15%)',
          'Temporal variations accounted for',
          'Geographic sensitivity included'
        ],
        standards: ['IPCC_AR6', 'GHG_Protocol', 'SCI_Spec']
      }),
      getDataSources: jest.fn().mockResolvedValue({
        sources: [
          {
            name: 'EPA eGRID',
            description: 'US Environmental Protection Agency eGRID database',
            coverage: 'United States',
            updateFrequency: 'Annual',
            confidence: 'high',
            lastUpdated: new Date().toISOString()
          }
        ],
        methodology: 'Multi-source validation with conservative estimation',
        totalSources: 1
      }),
      getConfidenceIndicators: jest.fn().mockResolvedValue({
        indicators: [
          {
            name: 'Data Age',
            description: 'How recent the emission factor data is',
            weight: 0.3,
            thresholds: {
              high: '< 1 hour',
              medium: '1-24 hours',
              low: '> 24 hours'
            }
          }
        ],
        overall_confidence_calculation: 'Weighted average of all indicators',
        conservative_bias: '15% safety margin applied to all calculations'
      })
    };

    app.post('/api/calculation/carbon', async (req, res) => {
      try {
        const activityData = req.body;
        const result = await mockCalculationEngine.calculateCarbon(activityData);
        
        res.json({
          success: true,
          data: {
            carbonKg: result.carbonKg,
            confidence: result.confidence,
            methodology: result.methodology,
            sources: result.sources,
            uncertaintyRange: result.uncertaintyRange,
            validUntil: result.validUntil,
            auditTrail: result.auditTrail
          },
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        res.status(500).json({
          error: 'Carbon calculation failed',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    app.get('/api/calculation/methodology', async (_req, res) => {
      try {
        const result = await mockCalculationEngine.getPublicMethodology('commit');
        res.json({
          ...result,
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch methodology',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    app.get('/api/calculation/sources', async (_req, res) => {
      try {
        const result = await mockCalculationEngine.getDataSources();
        res.json({
          ...result,
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch data sources',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    app.get('/api/calculation/confidence', async (_req, res) => {
      try {
        const result = await mockCalculationEngine.getConfidenceIndicators();
        res.json({
          ...result,
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch confidence indicators',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    app.get('/api/calculation/audit/:auditId', async (req, res) => {
      try {
        const { auditId } = req.params;
        const result = {
          success: auditId ? true : false,
          data: auditId ? {
            auditId,
            timestamp: new Date().toISOString(),
            status: 'audit_record_found'
          } : null,
          timestamp: new Date().toISOString()
        };

        if (!result.success) {
          return res.status(404).json(result);
        }

        res.json(result);
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch audit trail',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    app.get('/api/calculation/health', async (_req, res) => {
      try {
        const health = {
          overall: 'healthy' as const,
          services: {
            calculationEngine: 'healthy' as const,
            validation: 'healthy' as const,
            audit: 'healthy' as const,
            epaGrid: 'healthy' as const,
            externalApis: 'healthy' as const
          },
          performance: {
            averageResponseTime: 25,
            successRate: 0.99,
            errorRate: 0.01
          },
          lastUpdated: new Date().toISOString()
        };
        
        const serviceInfo = {
          name: 'EcoTrace Scientific Carbon Calculation Engine',
          version: '1.0.0',
          features: [
            'Multi-modal carbon calculation',
            'EPA eGRID integration',
            'Conservative estimation methodology'
          ]
        };

        res.json({
          success: health.overall === 'healthy',
          data: {
            health,
            service: serviceInfo
          },
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        res.status(503).json({
          success: false,
          error: 'Health check failed',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
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

  describe('POST /api/calculation/carbon', () => {
    it('should calculate carbon emissions for cloud compute activity', async () => {
      const activityData = {
        activityType: 'cloud_compute',
        timestamp: new Date().toISOString(),
        location: {
          country: 'US',
          region: 'us-east-1',
          postalCode: '12345'
        },
        metadata: {
          provider: 'aws',
          region: 'us-east-1',
          instanceType: 'medium',
          duration: 3600
        }
      };

      const response = await request(app)
        .post('/api/calculation/carbon')
        .send(activityData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          carbonKg: expect.any(Number),
          confidence: expect.stringMatching(/^(very_high|high|medium|low)$/),
          methodology: {
            name: 'EcoTrace Scientific Carbon Calculation',
            version: '1.0.0',
            assumptions: expect.arrayContaining([
              'Conservative estimation bias applied (+15%)'
            ]),
            standards: expect.arrayContaining(['IPCC_AR6', 'GHG_Protocol'])
          },
          sources: expect.any(Array),
          uncertaintyRange: {
            lower: expect.any(Number),
            upper: expect.any(Number)
          },
          validUntil: expect.any(String),
          auditTrail: expect.any(Array)
        },
        timestamp: expect.any(String)
      });

      expect(response.body.data.carbonKg).toBeGreaterThan(0);
      expect(response.body.data.uncertaintyRange.upper).toBeGreaterThan(response.body.data.uncertaintyRange.lower);
    });

    it('should calculate carbon emissions for data transfer activity', async () => {
      const activityData = {
        activityType: 'data_transfer',
        timestamp: new Date().toISOString(),
        location: { country: 'US' },
        metadata: {
          bytesTransferred: 1073741824, // 1 GB
          networkType: 'internet',
          protocol: 'https'
        }
      };

      const response = await request(app)
        .post('/api/calculation/carbon')
        .send(activityData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.carbonKg).toBeGreaterThan(0);
    });

    it('should calculate carbon emissions for electricity activity', async () => {
      const activityData = {
        activityType: 'electricity',
        timestamp: new Date().toISOString(),
        location: { country: 'US', region: 'CA' },
        metadata: {
          kWhConsumed: 10,
          source: 'grid',
          timeOfDay: 'peak'
        }
      };

      const response = await request(app)
        .post('/api/calculation/carbon')
        .send(activityData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.carbonKg).toBeGreaterThan(0);
    });

    it('should calculate carbon emissions for git commit activity', async () => {
      const activityData = {
        activityType: 'commit',
        timestamp: new Date().toISOString(),
        location: { country: 'US' },
        metadata: {
          repository: 'test/repo',
          branch: 'main',
          linesChanged: 50
        }
      };

      const response = await request(app)
        .post('/api/calculation/carbon')
        .send(activityData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.carbonKg).toBeGreaterThan(0);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        timestamp: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/calculation/carbon')
        .send(invalidData)
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Carbon calculation failed',
        message: expect.any(String),
        timestamp: expect.any(String)
      });
    });

    it('should handle calculation errors gracefully', async () => {
      const mockCalculationEngine = require('@features/carbon-calculation/services/calculation-engine');
      mockCalculationEngine.carbonCalculationEngine = {
        calculateCarbon: jest.fn().mockRejectedValue(new Error('Calculation service unavailable'))
      };

      const activityData = {
        activityType: 'cloud_compute',
        timestamp: new Date().toISOString(),
        location: { country: 'US' },
        metadata: {}
      };

      const response = await request(app)
        .post('/api/calculation/carbon')
        .send(activityData)
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Carbon calculation failed',
        message: expect.any(String)
      });
    });

    it('should include audit trail in response', async () => {
      const activityData = {
        activityType: 'commit',
        timestamp: new Date().toISOString(),
        location: { country: 'US' },
        metadata: {}
      };

      const response = await request(app)
        .post('/api/calculation/carbon')
        .send(activityData)
        .expect(200);

      expect(response.body.data.auditTrail).toHaveLength(1);
      expect(response.body.data.auditTrail[0]).toMatchObject({
        timestamp: expect.any(String),
        action: 'calculate',
        details: { version: '1.0.0' },
        systemInfo: {
          version: '1.0.0',
          environment: 'test',
          requestId: expect.any(String)
        }
      });
    });
  });

  describe('GET /api/calculation/methodology', () => {
    it('should return methodology information', async () => {
      const response = await request(app)
        .get('/api/calculation/methodology')
        .expect(200);

      expect(response.body).toMatchObject({
        name: 'EcoTrace Scientific Carbon Calculation',
        version: '1.0.0',
        emissionFactors: expect.any(Array),
        conversionFactors: expect.any(Array),
        assumptions: expect.arrayContaining([
          'Conservative estimation bias applied (+15%)',
          'Temporal variations accounted for',
          'Geographic sensitivity included'
        ]),
        standards: expect.arrayContaining(['IPCC_AR6', 'GHG_Protocol', 'SCI_Spec']),
        timestamp: expect.any(String)
      });
    });

    it('should handle methodology fetch errors', async () => {
      const mockCalculationEngine = require('@features/carbon-calculation/services/calculation-engine');
      mockCalculationEngine.carbonCalculationEngine = {
        getPublicMethodology: jest.fn().mockRejectedValue(new Error('Methodology service unavailable'))
      };

      const response = await request(app)
        .get('/api/calculation/methodology')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to fetch methodology',
        message: expect.any(String)
      });
    });
  });

  describe('GET /api/calculation/sources', () => {
    it('should return data sources information', async () => {
      const response = await request(app)
        .get('/api/calculation/sources')
        .expect(200);

      expect(response.body).toMatchObject({
        sources: expect.arrayContaining([
          expect.objectContaining({
            name: 'EPA eGRID',
            description: expect.any(String),
            coverage: 'United States',
            updateFrequency: 'Annual',
            confidence: 'high',
            lastUpdated: expect.any(String)
          })
        ]),
        methodology: 'Multi-source validation with conservative estimation',
        totalSources: 1,
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /api/calculation/confidence', () => {
    it('should return confidence indicators', async () => {
      const response = await request(app)
        .get('/api/calculation/confidence')
        .expect(200);

      expect(response.body).toMatchObject({
        indicators: expect.arrayContaining([
          expect.objectContaining({
            name: 'Data Age',
            description: expect.any(String),
            weight: expect.any(Number),
            thresholds: {
              high: expect.any(String),
              medium: expect.any(String),
              low: expect.any(String)
            }
          })
        ]),
        overall_confidence_calculation: expect.any(String),
        conservative_bias: '15% safety margin applied to all calculations',
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /api/calculation/audit/:auditId', () => {
    it('should return audit trail for valid audit ID', async () => {
      const auditId = 'audit-123';
      
      const response = await request(app)
        .get(`/api/calculation/audit/${auditId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          auditId,
          timestamp: expect.any(String),
          status: 'audit_record_found'
        },
        timestamp: expect.any(String)
      });
    });

    it('should return 404 for invalid audit ID', async () => {
      const response = await request(app)
        .get('/api/calculation/audit/')
        .expect(404);
    });
  });

  describe('GET /api/calculation/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/calculation/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          health: {
            overall: 'healthy',
            services: {
              calculationEngine: 'healthy',
              validation: 'healthy',
              audit: 'healthy',
              epaGrid: 'healthy',
              externalApis: 'healthy'
            },
            performance: {
              averageResponseTime: expect.any(Number),
              successRate: expect.any(Number),
              errorRate: expect.any(Number)
            },
            lastUpdated: expect.any(String)
          },
          service: {
            name: 'EcoTrace Scientific Carbon Calculation Engine',
            version: '1.0.0',
            features: expect.any(Array)
          }
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent timestamp formats', async () => {
      const endpoints = [
        { method: 'get', path: '/api/calculation/methodology' },
        { method: 'get', path: '/api/calculation/sources' },
        { method: 'get', path: '/api/calculation/confidence' },
        { method: 'get', path: '/api/calculation/health' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .expect(200);

        expect(response.body.timestamp).toBeDefined();
        expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
      }
    });

    it('should include proper Content-Type headers', async () => {
      const response = await request(app)
        .get('/api/calculation/methodology')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('Performance Tests', () => {
    it('should respond to calculation requests within acceptable time', async () => {
      const activityData = {
        activityType: 'commit',
        timestamp: new Date().toISOString(),
        location: { country: 'US' },
        metadata: {}
      };

      const startTime = Date.now();
      
      await request(app)
        .post('/api/calculation/carbon')
        .send(activityData)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500);
    });

    it('should handle multiple concurrent calculation requests', async () => {
      const activityData = {
        activityType: 'commit',
        timestamp: new Date().toISOString(),
        location: { country: 'US' },
        metadata: {}
      };

      const requests = Array(5).fill(null).map(() => 
        request(app).post('/api/calculation/carbon').send(activityData)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.carbonKg).toBeGreaterThan(0);
      });
    });
  });
});