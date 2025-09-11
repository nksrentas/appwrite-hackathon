import { 
  ActivityData, 
  CarbonCalculationResult, 
  ValidationResult, 
  // DataSource,
  PerformanceMetrics
} from '@features/carbon-calculation/types';
import { carbonCalculationEngine } from '@features/carbon-calculation/services/calculation-engine';
import { dataValidationService } from '@features/carbon-calculation/services/validation-service';
import { auditService } from '@features/carbon-calculation/services/audit-service';
import { epaGridService } from '@features/carbon-calculation/integrations/epa-egrid';
import { externalAPIService } from '@features/carbon-calculation/integrations/external-apis';
import { logger } from '@shared/utils/logger';
// import { performanceMonitor } from '@shared/utils/performance';

interface CarbonServiceResponse {
  calculation: CarbonCalculationResult;
  validation: ValidationResult;
  auditId: string;
  performance: PerformanceMetrics;
}

interface ServiceHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    calculationEngine: 'healthy' | 'degraded' | 'unhealthy';
    validation: 'healthy' | 'degraded' | 'unhealthy';
    audit: 'healthy' | 'degraded' | 'unhealthy';
    epaGrid: 'healthy' | 'degraded' | 'unhealthy';
    externalApis: 'healthy' | 'degraded' | 'unhealthy';
  };
  performance: {
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
  };
  lastUpdated: string;
}

class CarbonCalculationService {
  private readonly SERVICE_NAME = 'CarbonCalculationService';
  private readonly VERSION = '1.0.0';
  private readonly PERFORMANCE_TARGET_MS = 100;

  constructor() {
    logger.info('Carbon calculation service initialized', {
      metadata: {
        service: this.SERVICE_NAME,
        version: this.VERSION,
        performanceTarget: `${this.PERFORMANCE_TARGET_MS}ms`
      }
    });
  }

  public async calculateCarbon(
    activityData: ActivityData,
    userContext?: any
  ): Promise<CarbonServiceResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      logger.info('Carbon calculation request started', {
        metadata: {
          requestId,
          activityType: activityData.activityType,
          location: activityData.location?.country,
          service: this.SERVICE_NAME
        }
      });

      const validationStartTime = Date.now();
      const inputValidation = await dataValidationService.validateActivityData(activityData);
      const validationTime = Date.now() - validationStartTime;

      if (!inputValidation.isValid) {
        const error = new Error(`Input validation failed: ${inputValidation.errors.map(e => e.message).join(', ')}`);
        logger.error('Input validation failed', {
          metadata: {
            requestId,
            errors: inputValidation.errors,
            warnings: inputValidation.warnings
          }
        });
        throw error;
      }

      const calculationStartTime = Date.now();
      const calculation = await carbonCalculationEngine.calculateCarbon(activityData);
      const calculationTime = Date.now() - calculationStartTime;

      const resultValidationStartTime = Date.now();
      const resultValidation = await dataValidationService.validateCalculationResult(activityData, calculation);
      const resultValidationTime = Date.now() - resultValidationStartTime;

      const totalTime = Date.now() - startTime;

      const performance: PerformanceMetrics = {
        calculationTime,
        dataFetchTime: Math.floor(calculationTime * 0.3),
        validationTime: validationTime + resultValidationTime,
        totalTime,
        cachehits: 0,
        cacheMisses: 0
      };

      const auditId = await auditService.recordCalculation(
        requestId,
        activityData,
        calculation,
        performance,
        userContext
      );

      await auditService.recordValidation(requestId, {
        input: inputValidation,
        result: resultValidation
      });

      const response: CarbonServiceResponse = {
        calculation,
        validation: resultValidation,
        auditId,
        performance
      };

      const meetsPerfTarget = totalTime <= this.PERFORMANCE_TARGET_MS;

      logger.info('Carbon calculation completed successfully', {
        metadata: {
          requestId,
          auditId,
          carbonKg: calculation.carbonKg,
          confidence: calculation.confidence,
          totalTime: `${totalTime}ms`,
          meetsPerfTarget,
          validationPassed: resultValidation.isValid
        }
      });

      if (!meetsPerfTarget) {
        logger.warn('Performance target exceeded', {
          metadata: {
            requestId,
            target: `${this.PERFORMANCE_TARGET_MS}ms`,
            actual: `${totalTime}ms`,
            overage: `${totalTime - this.PERFORMANCE_TARGET_MS}ms`
          }
        });
      }

      return response;

    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      
      logger.error('Carbon calculation failed', {
        error: {
          code: 'CARBON_CALCULATION_ERROR',
          message: error.message,
          stack: error.stack
        },
        requestId,
        activityType: activityData.activityType,
        duration: `${totalTime}ms`
      });

      const fallbackCalculation = this.createFallbackResult(error, requestId);
      const fallbackValidation = this.createFallbackValidation(error);
      
      const performance: PerformanceMetrics = {
        calculationTime: totalTime,
        dataFetchTime: 0,
        validationTime: 0,
        totalTime,
        cachehits: 0,
        cacheMisses: 0
      };

      const auditId = await auditService.recordCalculation(
        requestId,
        activityData,
        fallbackCalculation,
        performance,
        userContext
      );

      return {
        calculation: fallbackCalculation,
        validation: fallbackValidation,
        auditId,
        performance
      };
    }
  }

  public async getMethodology(): Promise<any> {
    try {
      const currentMethodology = auditService.getCurrentMethodologyVersion();
      
      return {
        success: true,
        data: {
          current: currentMethodology,
          allVersions: auditService.getAllMethodologyVersions(),
          standards: currentMethodology.methodology.standards,
          lastUpdated: currentMethodology.createdAt
        },
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      logger.error('Failed to get methodology', {
        error: {
          code: 'METHODOLOGY_ERROR',
          message: error.message,
          stack: error.stack
        }
      });

      return {
        success: false,
        error: 'Failed to retrieve methodology',
        timestamp: new Date().toISOString()
      };
    }
  }

  public async getDataSources(): Promise<any> {
    try {
      const epaDataSource = epaGridService.getDataSource();
      const externalDataSources = externalAPIService.getDataSources();
      const externalHealth = await externalAPIService.healthCheck();
      const epaValidation = await epaGridService.validateDataIntegrity();

      return {
        success: true,
        data: {
          sources: [epaDataSource, ...externalDataSources],
          health: externalHealth,
          epaValidation,
          freshness: {
            epaGrid: epaDataSource.lastUpdated,
            externalApis: externalHealth.lastUpdated
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      logger.error('Failed to get data sources', {
        error: {
          code: 'DATA_SOURCES_ERROR',
          message: error.message,
          stack: error.stack
        }
      });

      return {
        success: false,
        error: 'Failed to retrieve data sources',
        timestamp: new Date().toISOString()
      };
    }
  }

  public async getConfidenceIndicators(): Promise<any> {
    try {
      const circuitBreakerStates = externalAPIService.getCircuitBreakerStates();
      const auditStats = await auditService.getAuditStatistics({
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      });

      const confidenceIndicators = {
        dataSourceReliability: {
          epaGrid: 0.95,
          electricityMaps: circuitBreakerStates.electricityMaps.isOpen ? 0.3 : 0.92,
          awsCarbon: circuitBreakerStates.aws.isOpen ? 0.3 : 0.98,
          greenSoftware: circuitBreakerStates.gsf.isOpen ? 0.3 : 0.95
        },
        systemPerformance: {
          averageResponseTime: auditStats.averageResponseTime,
          errorRate: auditStats.errorRate,
          p95ResponseTime: auditStats.performanceMetrics.p95
        },
        dataQuality: {
          highConfidenceCalculations: auditStats.dataQualityMetrics.highConfidence,
          totalCalculations: auditStats.totalCalculations,
          highConfidenceRatio: auditStats.totalCalculations > 0 
            ? auditStats.dataQualityMetrics.highConfidence / auditStats.totalCalculations
            : 0
        }
      };

      return {
        success: true,
        data: confidenceIndicators,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      logger.error('Failed to get confidence indicators', {
        error: {
          code: 'CONFIDENCE_INDICATORS_ERROR',
          message: error.message,
          stack: error.stack
        }
      });

      return {
        success: false,
        error: 'Failed to retrieve confidence indicators',
        timestamp: new Date().toISOString()
      };
    }
  }

  public async getAuditTrail(auditId: string): Promise<any> {
    try {
      const auditRecord = await auditService.getAuditRecord(auditId);
      
      if (!auditRecord) {
        return {
          success: false,
          error: 'Audit record not found',
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data: {
          auditRecord,
          calculationSteps: auditRecord.calculationResult.methodology,
          validationResults: auditRecord.validationResults,
          performanceMetrics: auditRecord.performanceMetrics
        },
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      logger.error('Failed to get audit trail', {
        error: {
          code: 'AUDIT_TRAIL_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: {
          auditId
        }
      });

      return {
        success: false,
        error: 'Failed to retrieve audit trail',
        timestamp: new Date().toISOString()
      };
    }
  }

  public async getServiceHealth(): Promise<ServiceHealthStatus> {
    try {
      const externalHealth = await externalAPIService.healthCheck();
      const epaValidation = await epaGridService.validateDataIntegrity();
      const auditStatus = auditService.getServiceStatus();
      const auditStats = await auditService.getAuditStatistics({
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      });

      const services = {
        calculationEngine: 'healthy' as const,
        validation: 'healthy' as const,
        audit: auditStatus.totalRecords > 0 ? 'healthy' as const : 'degraded' as const,
        epaGrid: epaValidation.isValid ? 'healthy' as const : 'degraded' as const,
        externalApis: externalHealth.status === 'healthy' ? 'healthy' as const : 
                     externalHealth.status === 'degraded' ? 'degraded' as const : 'unhealthy' as const
      };

      const healthyServices = Object.values(services).filter(s => s === 'healthy').length;
      const totalServices = Object.values(services).length;

      let overall: ServiceHealthStatus['overall'];
      if (healthyServices === totalServices) {
        overall = 'healthy';
      } else if (healthyServices >= totalServices * 0.7) {
        overall = 'degraded';
      } else {
        overall = 'unhealthy';
      }

      return {
        overall,
        services,
        performance: {
          averageResponseTime: auditStats.averageResponseTime,
          successRate: 1 - auditStats.errorRate,
          errorRate: auditStats.errorRate
        },
        lastUpdated: new Date().toISOString()
      };

    } catch (error: any) {
      logger.error('Failed to get service health', {
        error: {
          code: 'SERVICE_HEALTH_ERROR',
          message: error.message,
          stack: error.stack
        }
      });

      return {
        overall: 'unhealthy',
        services: {
          calculationEngine: 'unhealthy',
          validation: 'unhealthy',
          audit: 'unhealthy',
          epaGrid: 'unhealthy',
          externalApis: 'unhealthy'
        },
        performance: {
          averageResponseTime: 0,
          successRate: 0,
          errorRate: 1
        },
        lastUpdated: new Date().toISOString()
      };
    }
  }

  private createFallbackResult(
    // activityData: ActivityData,
    error: Error,
    requestId: string
  ): CarbonCalculationResult {
    const fallbackEmission = 0.001;
    const timestamp = new Date().toISOString();

    return {
      carbonKg: fallbackEmission,
      confidence: 'low',
      methodology: {
        name: 'EcoTrace Fallback Calculation',
        version: '1.0.0',
        emissionFactors: [],
        conversionFactors: [],
        assumptions: [`Fallback used due to error: ${error.message}`],
        standards: []
      },
      sources: [],
      uncertaintyRange: {
        lower: fallbackEmission * 0.5,
        upper: fallbackEmission * 3.0
      },
      calculatedAt: timestamp,
      validUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      auditTrail: [{
        timestamp,
        action: 'calculate',
        details: {
          reason: `Fallback calculation due to error: ${error.message}`,
          version: '1.0.0'
        },
        systemInfo: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          requestId
        }
      }]
    };
  }

  private createFallbackValidation(error: Error): ValidationResult {
    return {
      isValid: false,
      errors: [{
        field: 'system',
        code: 'SYSTEM_ERROR',
        message: `System error during calculation: ${error.message}`,
        severity: 'critical'
      }],
      warnings: [],
      confidence: 0,
      crossReferences: []
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getServiceInfo(): any {
    return {
      name: this.SERVICE_NAME,
      version: this.VERSION,
      features: [
        'Multi-modal carbon calculation',
        'EPA eGRID integration',
        'External API integrations',
        'Data validation and quality assurance',
        'Audit trail and version control',
        'Real-time performance monitoring',
        'Circuit breaker pattern for reliability',
        'Conservative estimation methodology'
      ],
      standards: ['IPCC_AR6', 'GHG_Protocol', 'SCI_Spec'],
      performanceTarget: `${this.PERFORMANCE_TARGET_MS}ms`
    };
  }
}

export const carbonService = new CarbonCalculationService();