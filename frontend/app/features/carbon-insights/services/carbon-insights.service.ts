import { logger } from '@shared/utils/logger';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.ecotrace.dev' 
  : 'http://localhost:3001';

export interface CarbonInsight {
  totalEmissions: number;
  weeklyEmissions: number;
  efficiencyScore: number;
  intensity: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  lastUpdated: string;
  breakdown: Array<{
    category: string;
    value: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    emissions: number;
    timestamp: string;
  }>;
  performance: {
    status: 'good' | 'warning' | 'poor';
    responseTime: number;
    successRate: number;
    dataFreshness: number;
  };
}

export interface CarbonTrend {
  timestamp: string;
  value: number;
  category: string;
  confidence: number;
}

export interface CarbonForecast {
  predictions: Array<{
    timestamp: string;
    predicted: number;
    confidence: number;
    lower: number;
    upper: number;
  }>;
  recommendations: Array<{
    type: 'efficiency' | 'timing' | 'methodology';
    title: string;
    description: string;
    impact: number;
    difficulty: 'low' | 'medium' | 'high';
  }>;
}

export interface CarbonMethodology {
  name: string;
  version: string;
  standards: string[];
  description: string;
  emissionFactors: Array<{
    source: string;
    category: string;
    factor: number;
    unit: string;
    lastUpdated: string;
  }>;
  assumptions: string[];
}

export interface CarbonDataSource {
  name: string;
  type: 'primary' | 'secondary';
  status: 'active' | 'inactive' | 'error';
  coverage: number;
  lastUpdated: string;
  reliability: number;
  latency: number;
}

export interface ConfidenceMetrics {
  overall: number;
  dataQuality: number;
  methodological: number;
  temporal: number;
  coverage: number;
  factors: Array<{
    name: string;
    impact: 'positive' | 'negative';
    description: string;
  }>;
}

class CarbonInsightsService {
  private readonly BASE_PATH = '/api/carbon-insights';

  async getCarbonInsights(userId: string, timeRange: string = '7d'): Promise<CarbonInsight> {
    try {
      logger.info('Fetching carbon insights', { userId, timeRange });
      
      const response = await fetch(`${API_BASE_URL}${this.BASE_PATH}/overview?userId=${userId}&timeRange=${timeRange}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch insights: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch carbon insights');
      }

      return data.data;
    } catch (error) {
      logger.error('Failed to fetch carbon insights', { error, userId, timeRange });
      throw error;
    }
  }

  async getCarbonTrends(userId: string, timeRange: string = '30d'): Promise<CarbonTrend[]> {
    try {
      logger.info('Fetching carbon trends', { userId, timeRange });
      
      const response = await fetch(`${API_BASE_URL}${this.BASE_PATH}/trends?userId=${userId}&timeRange=${timeRange}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch trends: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch carbon trends');
      }

      return data.data;
    } catch (error) {
      logger.error('Failed to fetch carbon trends', { error, userId, timeRange });
      throw error;
    }
  }

  async getCarbonForecast(userId: string, days: number = 30): Promise<CarbonForecast> {
    try {
      logger.info('Fetching carbon forecast', { userId, days });
      
      const response = await fetch(`${API_BASE_URL}${this.BASE_PATH}/forecast?userId=${userId}&days=${days}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch forecast: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch carbon forecast');
      }

      return data.data;
    } catch (error) {
      logger.error('Failed to fetch carbon forecast', { error, userId, days });
      throw error;
    }
  }

  async getCarbonMethodology(): Promise<CarbonMethodology> {
    try {
      logger.info('Fetching carbon methodology');
      
      const response = await fetch(`${API_BASE_URL}/api/carbon-calculation/methodology`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch methodology: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch carbon methodology');
      }

      return data.data.current.methodology;
    } catch (error) {
      logger.error('Failed to fetch carbon methodology', { error });
      throw error;
    }
  }

  async getDataSources(): Promise<CarbonDataSource[]> {
    try {
      logger.info('Fetching data sources');
      
      const response = await fetch(`${API_BASE_URL}/api/carbon-calculation/data-sources`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data sources: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch data sources');
      }

      // Transform backend data to frontend format
      return data.data.sources.map((source: any) => ({
        name: source.name,
        type: source.type || 'secondary',
        status: source.status || 'active',
        coverage: source.coverage || 0,
        lastUpdated: source.lastUpdated || new Date().toISOString(),
        reliability: source.reliability || 0,
        latency: source.latency || 0,
      }));
    } catch (error) {
      logger.error('Failed to fetch data sources', { error });
      throw error;
    }
  }

  async getConfidenceMetrics(userId: string): Promise<ConfidenceMetrics> {
    try {
      logger.info('Fetching confidence metrics', { userId });
      
      const response = await fetch(`${API_BASE_URL}/api/carbon-calculation/confidence-indicators`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch confidence metrics: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch confidence metrics');
      }

      // Transform backend data to frontend format
      const indicators = data.data;
      const overall = (
        indicators.dataSourceReliability.epaGrid +
        indicators.dataSourceReliability.electricityMaps +
        indicators.dataSourceReliability.awsCarbon +
        indicators.dataSourceReliability.greenSoftware
      ) / 4;

      return {
        overall: Math.round(overall * 100),
        dataQuality: Math.round(indicators.dataQuality.highConfidenceRatio * 100),
        methodological: 95, // Static for now
        temporal: 90, // Static for now
        coverage: 85, // Static for now
        factors: [
          {
            name: 'High-quality data sources',
            impact: 'positive',
            description: 'EPA eGRID and verified external APIs provide reliable emission factors',
          },
          {
            name: 'Real-time validation',
            impact: 'positive',
            description: 'Continuous data validation ensures accuracy and consistency',
          },
          {
            name: 'Network dependency',
            impact: 'negative',
            description: 'Confidence may be reduced during external API outages',
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to fetch confidence metrics', { error, userId });
      throw error;
    }
  }

  async getAuditTrail(auditId: string): Promise<any> {
    try {
      logger.info('Fetching audit trail', { auditId });
      
      const response = await fetch(`${API_BASE_URL}/api/carbon-calculation/audit/${auditId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch audit trail: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch audit trail');
      }

      return data.data;
    } catch (error) {
      logger.error('Failed to fetch audit trail', { error, auditId });
      throw error;
    }
  }

  async calculateCarbon(activityData: any): Promise<any> {
    try {
      logger.info('Calculating carbon footprint', { activityType: activityData.activityType });
      
      const response = await fetch(`${API_BASE_URL}/api/carbon-calculation/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      });

      if (!response.ok) {
        throw new Error(`Failed to calculate carbon: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to calculate carbon footprint');
      }

      return data.data;
    } catch (error) {
      logger.error('Failed to calculate carbon footprint', { error, activityData });
      throw error;
    }
  }

  async getServiceHealth(): Promise<any> {
    try {
      logger.info('Fetching service health');
      
      const response = await fetch(`${API_BASE_URL}/api/carbon-calculation/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch service health: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to fetch service health', { error });
      throw error;
    }
  }

  // Mock data generation for development
  generateMockInsights(userId: string): CarbonInsight {
    return {
      totalEmissions: Math.round(Math.random() * 1000 + 500),
      weeklyEmissions: Math.round(Math.random() * 200 + 100),
      efficiencyScore: Math.round(Math.random() * 40 + 60),
      intensity: Math.round(Math.random() * 100 + 50),
      trend: Math.random() > 0.5 ? 'down' : 'up',
      trendValue: Math.round(Math.random() * 20 + 5),
      lastUpdated: new Date().toISOString(),
      breakdown: [
        { category: 'CI/CD', value: 450, percentage: 45 },
        { category: 'Development', value: 300, percentage: 30 },
        { category: 'Deployment', value: 150, percentage: 15 },
        { category: 'Other', value: 100, percentage: 10 },
      ],
      recentActivity: [
        {
          type: 'CI Run',
          description: 'Backend tests completed',
          emissions: 25,
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
        {
          type: 'Deployment',
          description: 'Production deployment',
          emissions: 75,
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        },
      ],
      performance: {
        status: 'good',
        responseTime: 85,
        successRate: 0.98,
        dataFreshness: 95,
      },
    };
  }

  generateMockTrends(timeRange: string): CarbonTrend[] {
    const points = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : 30;
    const trends: CarbonTrend[] = [];
    
    for (let i = 0; i < points; i++) {
      const date = new Date();
      if (timeRange === '24h') {
        date.setHours(date.getHours() - (points - i));
      } else if (timeRange === '7d') {
        date.setDate(date.getDate() - (points - i));
      } else {
        date.setDate(date.getDate() - (points - i));
      }
      
      trends.push({
        timestamp: date.toISOString(),
        value: Math.round(Math.random() * 100 + 50),
        category: 'total',
        confidence: Math.random() * 0.3 + 0.7,
      });
    }
    
    return trends;
  }
}

export const carbonInsightsService = new CarbonInsightsService();