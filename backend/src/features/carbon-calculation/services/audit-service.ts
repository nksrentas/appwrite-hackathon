import { 
  AuditEntry, 
  CarbonCalculationResult, 
  ActivityData, 
  PerformanceMetrics,
  CalculationMethodology
} from '@features/carbon-calculation/types';
import { logger } from '@shared/utils/logger';
import { CacheService } from '@shared/utils/cache';

interface AuditRecord {
  id: string;
  timestamp: string;
  requestId: string;
  activityData: ActivityData;
  calculationResult: CarbonCalculationResult;
  validationResults?: any;
  performanceMetrics: PerformanceMetrics;
  systemInfo: {
    version: string;
    environment: string;
    nodeVersion: string;
    hostname: string;
  };
  userContext?: {
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

interface VersionedMethodology {
  version: string;
  methodology: CalculationMethodology;
  createdAt: string;
  createdBy: string;
  changes: MethodologyChange[];
  deprecated?: boolean;
  supersededBy?: string;
}

interface MethodologyChange {
  field: string;
  previousValue: any;
  newValue: any;
  reason: string;
  timestamp: string;
}

interface AuditQuery {
  requestId?: string;
  activityType?: string;
  userId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  confidenceLevel?: string;
  carbonRange?: {
    min: number;
    max: number;
  };
  limit?: number;
  offset?: number;
}

interface AuditStatistics {
  totalCalculations: number;
  averageResponseTime: number;
  confidenceDistribution: Record<string, number>;
  activityTypeDistribution: Record<string, number>;
  errorRate: number;
  performanceMetrics: {
    p50: number;
    p95: number;
    p99: number;
  };
  dataQualityMetrics: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
}

class AuditService {
  private cache: CacheService;
  private auditRecords: Map<string, AuditRecord> = new Map();
  private methodologyVersions: Map<string, VersionedMethodology> = new Map();
  private readonly MAX_CACHE_SIZE = 100000;
  private readonly RETENTION_DAYS = 365;

  constructor() {
    this.cache = new CacheService('audit-trail', {
      defaultTTL: 7 * 24 * 60 * 60 * 1000,
      maxSize: this.MAX_CACHE_SIZE
    });

    this.initializeMethodologyVersioning();
    this.scheduleCleanup();
  }

  private initializeMethodologyVersioning(): void {
    const initialMethodology: VersionedMethodology = {
      version: '1.0.0',
      methodology: {
        name: 'EcoTrace Scientific Carbon Calculation',
        version: '1.0.0',
        emissionFactors: [],
        conversionFactors: [],
        assumptions: [
          'Conservative estimation bias applied (+15%)',
          'Temporal variations accounted for',
          'Geographic sensitivity included',
          'Uncertainty quantification provided'
        ],
        standards: ['IPCC_AR6', 'GHG_Protocol', 'SCI_Spec']
      },
      createdAt: new Date().toISOString(),
      createdBy: 'system',
      changes: []
    };

    this.methodologyVersions.set('1.0.0', initialMethodology);

    logger.info('Audit service initialized', {
      initialMethodologyVersion: '1.0.0',
      retentionDays: this.RETENTION_DAYS,
      maxCacheSize: this.MAX_CACHE_SIZE
    });
  }

  private scheduleCleanup(): void {
    const cleanupInterval = 24 * 60 * 60 * 1000;
    
    setInterval(() => {
      this.performCleanup();
    }, cleanupInterval);
  }

  public async recordCalculation(
    requestId: string,
    activityData: ActivityData,
    calculationResult: CarbonCalculationResult,
    performanceMetrics: PerformanceMetrics,
    userContext?: any
  ): Promise<string> {
    const auditId = this.generateAuditId();
    
    try {
      const auditRecord: AuditRecord = {
        id: auditId,
        timestamp: new Date().toISOString(),
        requestId,
        activityData,
        calculationResult,
        performanceMetrics,
        systemInfo: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          hostname: process.env.HOSTNAME || 'localhost'
        },
        userContext
      };

      this.auditRecords.set(auditId, auditRecord);
      
      await this.cache.set(`audit_${auditId}`, auditRecord);

      const auditEntry: AuditEntry = {
        timestamp: auditRecord.timestamp,
        action: 'calculate',
        details: {
          requestId,
          version: calculationResult.methodology.version
        },
        systemInfo: {
          version: auditRecord.systemInfo.version,
          environment: auditRecord.systemInfo.environment,
          requestId
        }
      };

      calculationResult.auditTrail.push(auditEntry);

      logger.info('Calculation audit recorded', {
        auditId,
        requestId,
        activityType: activityData.activityType,
        carbonKg: calculationResult.carbonKg,
        confidence: calculationResult.confidence,
        responseTime: performanceMetrics.totalTime
      });

      return auditId;

    } catch (error: any) {
      logger.error('Failed to record calculation audit', {
        error: {
          code: 'AUDIT_RECORD_ERROR',
          message: error.message,
          stack: error.stack
        },
        requestId,
        auditId
      });
      throw error;
    }
  }

  public async recordValidation(
    requestId: string,
    validationResults: any
  ): Promise<void> {
    try {
      const existingRecords = Array.from(this.auditRecords.values())
        .filter(record => record.requestId === requestId);

      if (existingRecords.length > 0) {
        const record = existingRecords[0];
        record.validationResults = validationResults;
        
        await this.cache.set(`audit_${record.id}`, record);

        logger.info('Validation audit recorded', {
          requestId,
          auditId: record.id,
          isValid: validationResults.isValid,
          errorCount: validationResults.errors?.length || 0,
          confidence: validationResults.confidence
        });
      }

    } catch (error: any) {
      logger.error('Failed to record validation audit', {
        error: {
          code: 'VALIDATION_AUDIT_ERROR',
          message: error.message,
          stack: error.stack
        },
        requestId
      });
    }
  }

  public async getAuditRecord(auditId: string): Promise<AuditRecord | null> {
    try {
      let record = this.auditRecords.get(auditId);
      
      if (!record) {
        record = await this.cache.get<AuditRecord>(`audit_${auditId}`);
      }

      return record || null;

    } catch (error: any) {
      logger.error('Failed to retrieve audit record', {
        error: {
          code: 'AUDIT_RETRIEVE_ERROR',
          message: error.message,
          stack: error.stack
        },
        auditId
      });
      return null;
    }
  }

  public async queryAuditRecords(query: AuditQuery): Promise<{
    records: AuditRecord[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      let filteredRecords = Array.from(this.auditRecords.values());

      if (query.requestId) {
        filteredRecords = filteredRecords.filter(r => r.requestId === query.requestId);
      }

      if (query.activityType) {
        filteredRecords = filteredRecords.filter(r => r.activityData.activityType === query.activityType);
      }

      if (query.userId && query.userId !== 'all') {
        filteredRecords = filteredRecords.filter(r => r.userContext?.userId === query.userId);
      }

      if (query.dateRange) {
        const start = new Date(query.dateRange.start).getTime();
        const end = new Date(query.dateRange.end).getTime();
        filteredRecords = filteredRecords.filter(r => {
          const timestamp = new Date(r.timestamp).getTime();
          return timestamp >= start && timestamp <= end;
        });
      }

      if (query.confidenceLevel) {
        filteredRecords = filteredRecords.filter(r => r.calculationResult.confidence === query.confidenceLevel);
      }

      if (query.carbonRange) {
        filteredRecords = filteredRecords.filter(r => 
          r.calculationResult.carbonKg >= query.carbonRange!.min &&
          r.calculationResult.carbonKg <= query.carbonRange!.max
        );
      }

      filteredRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const totalCount = filteredRecords.length;
      const offset = query.offset || 0;
      const limit = query.limit || 50;
      
      const paginatedRecords = filteredRecords.slice(offset, offset + limit);
      const hasMore = offset + limit < totalCount;

      logger.info('Audit records queried', {
        query,
        totalCount,
        returnedCount: paginatedRecords.length,
        hasMore
      });

      return {
        records: paginatedRecords,
        totalCount,
        hasMore
      };

    } catch (error: any) {
      logger.error('Failed to query audit records', {
        error: {
          code: 'AUDIT_QUERY_ERROR',
          message: error.message,
          stack: error.stack
        },
        query
      });
      
      return {
        records: [],
        totalCount: 0,
        hasMore: false
      };
    }
  }

  public async getAuditStatistics(dateRange?: { start: string; end: string }): Promise<AuditStatistics> {
    try {
      let records = Array.from(this.auditRecords.values());

      if (dateRange) {
        const start = new Date(dateRange.start).getTime();
        const end = new Date(dateRange.end).getTime();
        records = records.filter(r => {
          const timestamp = new Date(r.timestamp).getTime();
          return timestamp >= start && timestamp <= end;
        });
      }

      const totalCalculations = records.length;
      const averageResponseTime = records.length > 0 
        ? records.reduce((sum, r) => sum + r.performanceMetrics.totalTime, 0) / records.length
        : 0;

      const confidenceDistribution: Record<string, number> = {};
      const activityTypeDistribution: Record<string, number> = {};
      let errorCount = 0;
      const responseTimes: number[] = [];

      records.forEach(record => {
        const confidence = record.calculationResult.confidence;
        confidenceDistribution[confidence] = (confidenceDistribution[confidence] || 0) + 1;

        const activityType = record.activityData.activityType;
        activityTypeDistribution[activityType] = (activityTypeDistribution[activityType] || 0) + 1;

        if (record.validationResults && !record.validationResults.isValid) {
          errorCount++;
        }

        responseTimes.push(record.performanceMetrics.totalTime);
      });

      responseTimes.sort((a, b) => a - b);
      
      const getPercentile = (arr: number[], percentile: number): number => {
        if (arr.length === 0) return 0;
        const index = Math.ceil((percentile / 100) * arr.length) - 1;
        return arr[Math.min(index, arr.length - 1)];
      };

      const statistics: AuditStatistics = {
        totalCalculations,
        averageResponseTime: Math.round(averageResponseTime * 100) / 100,
        confidenceDistribution,
        activityTypeDistribution,
        errorRate: totalCalculations > 0 ? errorCount / totalCalculations : 0,
        performanceMetrics: {
          p50: getPercentile(responseTimes, 50),
          p95: getPercentile(responseTimes, 95),
          p99: getPercentile(responseTimes, 99)
        },
        dataQualityMetrics: {
          highConfidence: confidenceDistribution['high'] || 0 + confidenceDistribution['very_high'] || 0,
          mediumConfidence: confidenceDistribution['medium'] || 0,
          lowConfidence: confidenceDistribution['low'] || 0
        }
      };

      logger.info('Audit statistics generated', {
        totalCalculations,
        dateRange,
        errorRate: statistics.errorRate
      });

      return statistics;

    } catch (error: any) {
      logger.error('Failed to generate audit statistics', {
        error: {
          code: 'AUDIT_STATS_ERROR',
          message: error.message,
          stack: error.stack
        },
        dateRange
      });

      return {
        totalCalculations: 0,
        averageResponseTime: 0,
        confidenceDistribution: {},
        activityTypeDistribution: {},
        errorRate: 0,
        performanceMetrics: { p50: 0, p95: 0, p99: 0 },
        dataQualityMetrics: { highConfidence: 0, mediumConfidence: 0, lowConfidence: 0 }
      };
    }
  }

  public async createMethodologyVersion(
    newMethodology: CalculationMethodology,
    changes: MethodologyChange[],
    createdBy: string
  ): Promise<string> {
    try {
      const newVersion = this.getNextVersion();
      
      const versionedMethodology: VersionedMethodology = {
        version: newVersion,
        methodology: { ...newMethodology, version: newVersion },
        createdAt: new Date().toISOString(),
        createdBy,
        changes
      };

      this.methodologyVersions.set(newVersion, versionedMethodology);

      await this.cache.set(`methodology_${newVersion}`, versionedMethodology);

      logger.info('New methodology version created', {
        version: newVersion,
        createdBy,
        changeCount: changes.length,
        standards: newMethodology.standards
      });

      return newVersion;

    } catch (error: any) {
      logger.error('Failed to create methodology version', {
        error: {
          code: 'METHODOLOGY_VERSION_ERROR',
          message: error.message,
          stack: error.stack
        },
        createdBy
      });
      throw error;
    }
  }

  public getMethodologyVersion(version: string): VersionedMethodology | null {
    return this.methodologyVersions.get(version) || null;
  }

  public getAllMethodologyVersions(): VersionedMethodology[] {
    return Array.from(this.methodologyVersions.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getCurrentMethodologyVersion(): VersionedMethodology {
    const versions = this.getAllMethodologyVersions();
    return versions.find(v => !v.deprecated) || versions[0];
  }

  public async deprecateMethodologyVersion(version: string, supersededBy?: string): Promise<void> {
    const versionedMethodology = this.methodologyVersions.get(version);
    
    if (versionedMethodology) {
      versionedMethodology.deprecated = true;
      versionedMethodology.supersededBy = supersededBy;
      
      await this.cache.set(`methodology_${version}`, versionedMethodology);

      logger.info('Methodology version deprecated', {
        version,
        supersededBy
      });
    }
  }

  private performCleanup(): void {
    const cutoffTime = Date.now() - (this.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [key, record] of this.auditRecords.entries()) {
      if (new Date(record.timestamp).getTime() < cutoffTime) {
        this.auditRecords.delete(key);
        cleanedCount++;
      }
    }

    if (this.auditRecords.size > this.MAX_CACHE_SIZE) {
      const recordsArray = Array.from(this.auditRecords.entries())
        .sort(([, a], [, b]) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      const toKeep = recordsArray.slice(0, this.MAX_CACHE_SIZE);
      this.auditRecords.clear();
      
      toKeep.forEach(([key, record]) => {
        this.auditRecords.set(key, record);
      });

      cleanedCount += recordsArray.length - this.MAX_CACHE_SIZE;
    }

    if (cleanedCount > 0) {
      logger.info('Audit records cleanup completed', {
        cleanedCount,
        remainingCount: this.auditRecords.size,
        retentionDays: this.RETENTION_DAYS
      });
    }
  }

  private getNextVersion(): string {
    const versions = Array.from(this.methodologyVersions.keys())
      .map(v => v.split('.').map(Number))
      .sort((a, b) => {
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
          const aVal = a[i] || 0;
          const bVal = b[i] || 0;
          if (aVal !== bVal) return bVal - aVal;
        }
        return 0;
      });

    if (versions.length === 0) {
      return '1.0.0';
    }

    const latest = versions[0];
    return `${latest[0]}.${latest[1]}.${latest[2] + 1}`;
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getServiceStatus(): {
    totalRecords: number;
    cacheSize: number;
    methodologyVersions: number;
    oldestRecord?: string;
    newestRecord?: string;
  } {
    const records = Array.from(this.auditRecords.values());
    const timestamps = records.map(r => r.timestamp).sort();

    return {
      totalRecords: this.auditRecords.size,
      cacheSize: this.cache.size || 0,
      methodologyVersions: this.methodologyVersions.size,
      oldestRecord: timestamps[0],
      newestRecord: timestamps[timestamps.length - 1]
    };
  }
}

export const auditService = new AuditService();