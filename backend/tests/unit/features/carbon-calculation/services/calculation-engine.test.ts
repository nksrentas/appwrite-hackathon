import { carbonCalculationEngine } from '@features/carbon-calculation/services/calculation-engine';
import { 
  CloudComputeActivity, 
  DataTransferActivity, 
  StorageActivity,
  ElectricityActivity,
  ActivityData
} from '@features/carbon-calculation/types';
jest.mock('@features/carbon-calculation/integrations/epa-egrid');
jest.mock('@features/carbon-calculation/integrations/external-apis');
jest.mock('@shared/utils/logger');

describe('CarbonCalculationEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateCarbon', () => {
    describe('Cloud Compute Activities', () => {
      it('should calculate carbon emission for AWS EC2 instance', async () => {
        const activityData: CloudComputeActivity = {
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
            duration: 3600, // 1 hour
            memoryGbHours: 4
          }
        };

        const result = await carbonCalculationEngine.calculateCarbon(activityData);

        expect(result).toMatchObject({
          carbonKg: expect.any(Number),
          confidence: expect.stringMatching(/^(very_high|high|medium|low)$/),
          methodology: expect.objectContaining({
            name: 'EcoTrace Scientific Carbon Calculation',
            version: '1.0.0'
          }),
          sources: expect.any(Array),
          uncertaintyRange: expect.objectContaining({
            lower: expect.any(Number),
            upper: expect.any(Number)
          }),
          calculatedAt: expect.any(String),
          validUntil: expect.any(String),
          auditTrail: expect.any(Array)
        });

        // Verify carbon emission is positive and reasonable
        expect(result.carbonKg).toBeGreaterThan(0);
        expect(result.carbonKg).toBeLessThan(10); // Should not exceed 10kg for 1 hour compute

        // Verify uncertainty range is properly calculated
        expect(result.uncertaintyRange.upper).toBeGreaterThan(result.uncertaintyRange.lower);
        expect(result.uncertaintyRange.lower).toBeLessThan(result.carbonKg);
        expect(result.uncertaintyRange.upper).toBeGreaterThan(result.carbonKg);

        // Verify audit trail
        expect(result.auditTrail).toHaveLength(1);
        expect(result.auditTrail[0]).toMatchObject({
          timestamp: expect.any(String),
          action: 'calculate',
          details: expect.objectContaining({
            version: '1.0.0'
          }),
          systemInfo: expect.objectContaining({
            version: '1.0.0',
            environment: expect.any(String),
            requestId: expect.any(String)
          })
        });
      });

      it('should apply conservative bias to calculations', async () => {
        const activityData: CloudComputeActivity = {
          activityType: 'cloud_compute',
          timestamp: new Date().toISOString(),
          location: { country: 'US', region: 'us-east-1' },
          metadata: {
            provider: 'aws',
            region: 'us-east-1',
            instanceType: 'small',
            duration: 1800 // 30 minutes
          }
        };

        const result = await carbonCalculationEngine.calculateCarbon(activityData);

        // Conservative bias should result in higher emissions than base calculation
        expect(result.carbonKg).toBeGreaterThan(0);
        
        // Verify methodology mentions conservative estimation
        expect(result.methodology.assumptions).toContain('Conservative estimation bias applied (+15%)');
      });

      it('should handle different instance types correctly', async () => {
        const instanceTypes = ['small', 'medium', 'large', 'xlarge'];
        const results = [];

        for (const instanceType of instanceTypes) {
          const activityData: CloudComputeActivity = {
            activityType: 'cloud_compute',
            timestamp: new Date().toISOString(),
            location: { country: 'US', region: 'us-east-1' },
            metadata: {
              provider: 'aws',
              region: 'us-east-1',
              instanceType,
              duration: 3600
            }
          };

          const result = await carbonCalculationEngine.calculateCarbon(activityData);
          results.push({ instanceType, carbonKg: result.carbonKg });
        }

        // Larger instances should generally produce more emissions
        const smallEmission = results.find(r => r.instanceType === 'small')?.carbonKg || 0;
        const largeEmission = results.find(r => r.instanceType === 'large')?.carbonKg || 0;
        
        expect(largeEmission).toBeGreaterThan(smallEmission);
      });
    });

    describe('Data Transfer Activities', () => {
      it('should calculate data transfer emissions correctly', async () => {
        const activityData: DataTransferActivity = {
          activityType: 'data_transfer',
          timestamp: new Date().toISOString(),
          location: { country: 'US' },
          metadata: {
            bytesTransferred: 1073741824, // 1 GB
            networkType: 'internet',
            protocol: 'https'
          }
        };

        const result = await carbonCalculationEngine.calculateCarbon(activityData);

        expect(result.carbonKg).toBeGreaterThan(0);
        expect(result.carbonKg).toBeLessThan(0.1); // 1GB transfer should be under 0.1kg
        expect(result.confidence).toBeDefined();
      });

      it('should handle different network types with appropriate emission factors', async () => {
        const networkTypes = ['internet', 'cdn', 'internal'] as const;
        const results = [];

        for (const networkType of networkTypes) {
          const activityData: DataTransferActivity = {
            activityType: 'data_transfer',
            timestamp: new Date().toISOString(),
            location: { country: 'US' },
            metadata: {
              bytesTransferred: 1073741824, // 1 GB
              networkType,
              protocol: 'https'
            }
          };

          const result = await carbonCalculationEngine.calculateCarbon(activityData);
          results.push({ networkType, carbonKg: result.carbonKg });
        }

        // Internal network should have lowest emissions, internet highest
        const internalEmission = results.find(r => r.networkType === 'internal')?.carbonKg || 0;
        const internetEmission = results.find(r => r.networkType === 'internet')?.carbonKg || 0;
        
        expect(internetEmission).toBeGreaterThan(internalEmission);
      });
    });

    describe('Storage Activities', () => {
      it('should calculate storage emissions for different storage types', async () => {
        const storageTypes = ['ssd', 'hdd', 'object', 'archive'] as const;
        const results = [];

        for (const storageType of storageTypes) {
          const activityData: StorageActivity = {
            activityType: 'storage',
            timestamp: new Date().toISOString(),
            location: { country: 'US' },
            metadata: {
              sizeGB: 100,
              storageType,
              duration: 86400 // 24 hours
            }
          };

          const result = await carbonCalculationEngine.calculateCarbon(activityData);
          results.push({ storageType, carbonKg: result.carbonKg });
        }

        // SSD should have higher emissions than archive storage
        const ssdEmission = results.find(r => r.storageType === 'ssd')?.carbonKg || 0;
        const archiveEmission = results.find(r => r.storageType === 'archive')?.carbonKg || 0;
        
        expect(ssdEmission).toBeGreaterThan(archiveEmission);
        
        // All emissions should be positive
        results.forEach(result => {
          expect(result.carbonKg).toBeGreaterThan(0);
        });
      });
    });

    describe('Electricity Activities', () => {
      it('should calculate electricity emissions with time-of-day factors', async () => {
        const timeOfDayFactors = ['peak', 'off_peak', 'standard'] as const;
        const results = [];

        for (const timeOfDay of timeOfDayFactors) {
          const activityData: ElectricityActivity = {
            activityType: 'electricity',
            timestamp: new Date().toISOString(),
            location: { country: 'US', region: 'CA' },
            metadata: {
              kWhConsumed: 10,
              source: 'grid',
              timeOfDay
            }
          };

          const result = await carbonCalculationEngine.calculateCarbon(activityData);
          results.push({ timeOfDay, carbonKg: result.carbonKg });
        }

        // Peak hours should have higher emissions than off-peak
        const peakEmission = results.find(r => r.timeOfDay === 'peak')?.carbonKg || 0;
        const offPeakEmission = results.find(r => r.timeOfDay === 'off_peak')?.carbonKg || 0;
        
        expect(peakEmission).toBeGreaterThan(offPeakEmission);
      });

      it('should apply renewable energy discounts correctly', async () => {
        const sources = ['renewable', 'mixed', 'fossil'] as const;
        const results = [];

        for (const source of sources) {
          const activityData: ElectricityActivity = {
            activityType: 'electricity',
            timestamp: new Date().toISOString(),
            location: { country: 'US' },
            metadata: {
              kWhConsumed: 10,
              source,
              timeOfDay: 'standard'
            }
          };

          const result = await carbonCalculationEngine.calculateCarbon(activityData);
          results.push({ source, carbonKg: result.carbonKg });
        }

        // Renewable should have lowest emissions, fossil highest
        const renewableEmission = results.find(r => r.source === 'renewable')?.carbonKg || 0;
        const fossilEmission = results.find(r => r.source === 'fossil')?.carbonKg || 0;
        
        expect(fossilEmission).toBeGreaterThan(renewableEmission);
      });
    });

    describe('Git Activities', () => {
      it('should calculate commit emissions with reasonable values', async () => {
        const activityData: ActivityData = {
          activityType: 'commit',
          timestamp: new Date().toISOString(),
          location: { country: 'US' },
          metadata: {}
        };

        const result = await carbonCalculationEngine.calculateCarbon(activityData);

        expect(result.carbonKg).toBeGreaterThan(0);
        expect(result.carbonKg).toBeLessThan(0.001); // Commits should have very low emissions
        expect(result.confidence).toBe('medium');
      });

      it('should calculate deployment emissions', async () => {
        const activityData: ActivityData = {
          activityType: 'deployment',
          timestamp: new Date().toISOString(),
          location: { country: 'US' },
          metadata: {}
        };

        const result = await carbonCalculationEngine.calculateCarbon(activityData);

        expect(result.carbonKg).toBeGreaterThan(0);
        expect(result.carbonKg).toBeLessThan(0.05); // Deployments should be small but more than commits
        expect(result.confidence).toBe('medium');
      });
    });

    describe('Error Handling', () => {
      it('should return fallback result for unsupported activity types', async () => {
        const activityData: ActivityData = {
          activityType: 'unsupported' as any,
          timestamp: new Date().toISOString(),
          location: { country: 'US' },
          metadata: {}
        };

        const result = await carbonCalculationEngine.calculateCarbon(activityData);

        expect(result.carbonKg).toBe(0.001); // Fallback emission
        expect(result.confidence).toBe('low');
        expect(result.methodology.name).toBe('EcoTrace Fallback Calculation');
        expect(result.auditTrail[0].details.reason).toContain('Calculation failed');
      });

      it('should handle missing location data gracefully', async () => {
        const activityData: CloudComputeActivity = {
          activityType: 'cloud_compute',
          timestamp: new Date().toISOString(),
          location: undefined,
          metadata: {
            provider: 'aws',
            region: 'us-east-1',
            instanceType: 'medium',
            duration: 3600
          }
        };

        const result = await carbonCalculationEngine.calculateCarbon(activityData);

        expect(result.carbonKg).toBeGreaterThan(0);
        expect(result.confidence).toBeDefined();
      });
    });

    describe('Performance Requirements', () => {
      it('should complete calculations within performance target', async () => {
        const activityData: CloudComputeActivity = {
          activityType: 'cloud_compute',
          timestamp: new Date().toISOString(),
          location: { country: 'US', region: 'us-east-1' },
          metadata: {
            provider: 'aws',
            region: 'us-east-1',
            instanceType: 'medium',
            duration: 3600
          }
        };

        const startTime = Date.now();
        const result = await carbonCalculationEngine.calculateCarbon(activityData);
        const endTime = Date.now();

        expect(result).toBeDefined();
        expect(endTime - startTime).toBeLessThan(100); // Performance target: 100ms
      });
    });

    describe('Confidence Levels', () => {
      it('should return appropriate confidence levels', async () => {
        const activityData: ElectricityActivity = {
          activityType: 'electricity',
          timestamp: new Date().toISOString(),
          location: { country: 'US', postalCode: '12345' },
          metadata: {
            kWhConsumed: 10,
            source: 'grid',
            timeOfDay: 'standard'
          }
        };

        const result = await carbonCalculationEngine.calculateCarbon(activityData);

        expect(['very_high', 'high', 'medium', 'low']).toContain(result.confidence);
        
        // Electricity with postal code should have high confidence
        expect(result.confidence).toMatch(/^(very_high|high)$/);
      });
    });

    describe('Data Validation', () => {
      it('should validate calculation accuracy against known benchmarks', async () => {
        // Test against known AWS EC2 t3.medium instance (4 GB RAM, 2 vCPUs)
        const activityData: CloudComputeActivity = {
          activityType: 'cloud_compute',
          timestamp: new Date().toISOString(),
          location: { country: 'US', region: 'us-east-1' },
          metadata: {
            provider: 'aws',
            region: 'us-east-1',
            instanceType: 'medium',
            duration: 3600, // 1 hour
            memoryGbHours: 4
          }
        };

        const result = await carbonCalculationEngine.calculateCarbon(activityData);

        // Based on industry benchmarks, 1 hour of t3.medium should be ~0.01-0.05 kg CO2
        expect(result.carbonKg).toBeGreaterThan(0.005);
        expect(result.carbonKg).toBeLessThan(0.1);
      });

      it('should ensure emission calculations are scientifically reasonable', async () => {
        const testCases = [
          {
            activity: {
              activityType: 'electricity' as const,
              metadata: { kWhConsumed: 1, source: 'grid' as const, timeOfDay: 'standard' as const }
            },
            expectedRange: { min: 0.1, max: 1.0 } // 1 kWh should be 0.1-1.0 kg CO2
          },
          {
            activity: {
              activityType: 'data_transfer' as const,
              metadata: { bytesTransferred: 1073741824, networkType: 'internet' as const, protocol: 'https' }
            },
            expectedRange: { min: 0.001, max: 0.01 } // 1 GB transfer
          }
        ];

        for (const testCase of testCases) {
          const activityData: ActivityData = {
            ...testCase.activity,
            timestamp: new Date().toISOString(),
            location: { country: 'US' }
          };

          const result = await carbonCalculationEngine.calculateCarbon(activityData);

          expect(result.carbonKg).toBeGreaterThanOrEqual(testCase.expectedRange.min);
          expect(result.carbonKg).toBeLessThanOrEqual(testCase.expectedRange.max);
        }
      });
    });
  });

  describe('Public API Methods', () => {
    describe('getPublicMethodology', () => {
      it('should return methodology information', async () => {
        const methodology = await carbonCalculationEngine.getPublicMethodology('commit');

        expect(methodology).toMatchObject({
          name: 'EcoTrace Scientific Carbon Calculation',
          version: '1.0.0',
          emissionFactors: expect.any(Array),
          conversionFactors: expect.any(Array),
          assumptions: expect.arrayContaining([
            'Conservative estimation bias applied (+15%)',
            'Temporal variations accounted for',
            'Geographic sensitivity included',
            'Uncertainty quantification provided'
          ]),
          standards: expect.arrayContaining(['IPCC_AR6', 'GHG_Protocol', 'SCI_Spec'])
        });
      });
    });

    describe('getDataSources', () => {
      it('should return data sources information', async () => {
        const dataSources = await carbonCalculationEngine.getDataSources();

        expect(dataSources).toMatchObject({
          sources: expect.arrayContaining([
            expect.objectContaining({
              name: 'EPA eGRID',
              description: expect.any(String),
              coverage: 'United States',
              updateFrequency: 'Annual',
              confidence: 'high'
            }),
            expect.objectContaining({
              name: 'Electricity Maps',
              description: expect.any(String),
              coverage: 'Global',
              updateFrequency: 'Real-time',
              confidence: 'high'
            })
          ]),
          methodology: 'Multi-source validation with conservative estimation',
          totalSources: 3
        });
      });
    });

    describe('getConfidenceIndicators', () => {
      it('should return confidence indicators', async () => {
        const indicators = await carbonCalculationEngine.getConfidenceIndicators();

        expect(indicators).toMatchObject({
          indicators: expect.arrayContaining([
            expect.objectContaining({
              name: 'Data Age',
              description: expect.any(String),
              weight: expect.any(Number),
              thresholds: expect.objectContaining({
                high: expect.any(String),
                medium: expect.any(String),
                low: expect.any(String)
              })
            })
          ]),
          overall_confidence_calculation: expect.any(String),
          conservative_bias: '15% safety margin applied to all calculations'
        });

        // Verify weights sum to 1.0
        const totalWeight = indicators.indicators.reduce((sum, indicator) => sum + indicator.weight, 0);
        expect(totalWeight).toBeCloseTo(1.0, 1);
      });
    });
  });
});