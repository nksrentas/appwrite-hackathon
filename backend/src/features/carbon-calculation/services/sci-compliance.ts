import { 
  ActivityData, 
  SCICalculation, 
  EmbodiedEmissions, 
  FunctionalUnitSpec,
  CloudComputeActivity,
  DataTransferActivity,
  StorageActivity
} from '../types';
import { logger } from '@shared/utils/logger';
import { externalAPIService } from '../integrations/external-apis';
import { epaGridService } from '../integrations/epa-egrid';

interface SCIConfig {
  includeEmbodiedEmissions: boolean;
  useMarginalEmissionFactors: boolean;
  temporalResolution: 'hourly' | 'daily' | 'monthly';
  functionalUnitType: 'automatic' | 'manual';
}

class SCIComplianceService {
  private config: SCIConfig;
  
  private readonly HARDWARE_LIFESPAN_YEARS = 4;
  private readonly SERVER_EMBODIED_CARBON_KG = 300;
  private readonly NETWORK_EMBODIED_CARBON_KG = 150;
  private readonly STORAGE_EMBODIED_CARBON_KG = 200;

  constructor() {
    this.config = {
      includeEmbodiedEmissions: true,
      useMarginalEmissionFactors: true,
      temporalResolution: 'hourly',
      functionalUnitType: 'automatic'
    };
  }

  public async calculateSCI(activityData: ActivityData, energyKWh: number): Promise<SCICalculation> {
    const startTime = Date.now();
    
    try {
      logger.info('SCI calculation started', {
        activityType: activityData.activityType,
        metadata: { 
          energyKWh,
          location: activityData.location?.country 
        }
      });

      const [carbonIntensity, embodiedEmissions, functionalUnit] = await Promise.all([
        this.getCarbonIntensity(activityData),
        this.calculateEmbodiedEmissions(activityData),
        this.determineFunctionalUnit(activityData)
      ]);

      const operationalEmissions = energyKWh * carbonIntensity;
      const totalEmbodiedEmissions = this.config.includeEmbodiedEmissions ? 
        embodiedEmissions.total : 0;

      const sciValue = (operationalEmissions + totalEmbodiedEmissions) / functionalUnit.value;
      const sciRating = this.calculateSCIRating(sciValue, activityData.activityType);

      const calculation: SCICalculation = {
        carbonIntensity,
        energyConsumption: energyKWh,
        embodiedEmissions: totalEmbodiedEmissions,
        functionalUnit: functionalUnit.value,
        sciValue,
        sciRating,
        methodology: {
          temporal: this.config.temporalResolution === 'hourly' ? 'real_time' : 'time_averaged',
          marginal: this.config.useMarginalEmissionFactors,
          locationBased: true
        },
        components: {
          operational: operationalEmissions,
          embodied: totalEmbodiedEmissions
        }
      };

      const duration = Date.now() - startTime;
      logger.info('SCI calculation completed', {
        activityType: activityData.activityType,
        metadata: { 
          sciValue: Math.round(calculation.sciValue * 1000000) / 1000000,
          sciRating: calculation.sciRating,
          operationalEmissions: Math.round(operationalEmissions * 1000000) / 1000000,
          embodiedEmissions: Math.round(totalEmbodiedEmissions * 1000000) / 1000000,
          functionalUnit: functionalUnit.value,
          duration: `${duration}ms`
        }
      });

      return calculation;

    } catch (error: any) {
      logger.error('SCI calculation failed', {
        error: {
          code: 'SCI_CALCULATION_ERROR',
          message: error.message,
          stack: error.stack
        },
        activityType: activityData.activityType,
        metadata: { 
          energyKWh,
          duration: `${Date.now() - startTime}ms` 
        }
      });
      throw error;
    }
  }

  private async getCarbonIntensity(activityData: ActivityData): Promise<number> {
    if (!this.config.useMarginalEmissionFactors) {
      return this.getAverageEmissionFactor(activityData);
    }

    const location = activityData.location?.country || 'US';
    const zone = this.getElectricityZone(activityData);
    
    try {
      const [electricityMapsData, epaData] = await Promise.all([
        externalAPIService.getElectricityMapsData(zone),
        activityData.location?.postalCode ? 
          epaGridService.getEmissionFactorByPostalCode(activityData.location.postalCode) :
          null
      ]);

      let marginalFactor = 415.755;

      if (electricityMapsData && electricityMapsData.source === 'real_time') {
        marginalFactor = electricityMapsData.carbonIntensity;
      } else if (epaData) {
        marginalFactor = epaData.emissionRate;
      }

      const marginalMultiplier = this.getMarginalMultiplier(location);
      return marginalFactor * marginalMultiplier;

    } catch (error: any) {
      logger.warn('Failed to get marginal emission factor, using average', {
        error: error.message,
        metadata: { location }
      });
      return this.getAverageEmissionFactor(activityData);
    }
  }

  private getAverageEmissionFactor(activityData: ActivityData): number {
    const location = activityData.location?.country || 'US';
    
    const avgFactors: Record<string, number> = {
      'US': 415.755,
      'CA': 130.45,
      'GB': 233.67,
      'FR': 77.23,
      'DE': 338.45,
      'JP': 491.23,
      'AU': 765.33,
      'CN': 555.12,
      'IN': 708.45,
      'BR': 82.44
    };
    
    return avgFactors[location] || 415.755;
  }

  private getMarginalMultiplier(location: string): number {
    const marginalMultipliers: Record<string, number> = {
      'US': 1.15,
      'CA': 1.05,
      'GB': 1.10,
      'FR': 1.20,
      'DE': 1.25,
      'JP': 1.30,
      'AU': 1.20,
      'CN': 1.40,
      'IN': 1.45,
      'BR': 1.10
    };
    
    return marginalMultipliers[location] || 1.15;
  }

  private getElectricityZone(activityData: ActivityData): string {
    const country = activityData.location?.country || 'US';
    const region = activityData.location?.region;
    
    if (country === 'US' && region) {
      const stateToZone: Record<string, string> = {
        'CA': 'US-CA', 'TX': 'US-TX', 'NY': 'US-NY', 'FL': 'US-FL',
        'WA': 'US-WA', 'OR': 'US-OR', 'NV': 'US-NV', 'AZ': 'US-AZ'
      };
      return stateToZone[region] || 'US-CA';
    }
    
    return country === 'US' ? 'US-CA' : country;
  }

  private async calculateEmbodiedEmissions(activityData: ActivityData): Promise<EmbodiedEmissions> {
    const baseHardwareEmissions = this.calculateHardwareEmissions(activityData);
    const softwareEmissions = this.calculateSoftwareEmissions(activityData);
    const infrastructureEmissions = this.calculateInfrastructureEmissions(activityData);

    const embodied: EmbodiedEmissions = {
      hardware: {
        servers: baseHardwareEmissions.servers,
        networking: baseHardwareEmissions.networking,
        storage: baseHardwareEmissions.storage,
        totalLifespanYears: this.HARDWARE_LIFESPAN_YEARS,
        utilizationRate: this.getUtilizationRate(activityData)
      },
      software: softwareEmissions,
      infrastructure: infrastructureEmissions,
      total: baseHardwareEmissions.total + softwareEmissions.total + infrastructureEmissions.total
    };

    const timeShare = this.calculateTimeShare(activityData);
    embodied.total *= timeShare;

    return embodied;
  }

  private calculateHardwareEmissions(activityData: ActivityData): {
    servers: number;
    networking: number;
    storage: number;
    total: number;
  } {
    const yearlyHours = 365 * 24;
    const serverEmissions = this.SERVER_EMBODIED_CARBON_KG / (this.HARDWARE_LIFESPAN_YEARS * yearlyHours);
    const networkEmissions = this.NETWORK_EMBODIED_CARBON_KG / (this.HARDWARE_LIFESPAN_YEARS * yearlyHours);
    const storageEmissions = this.STORAGE_EMBODIED_CARBON_KG / (this.HARDWARE_LIFESPAN_YEARS * yearlyHours);

    let serverCount = 1;
    let networkingFactor = 1;
    let storageFactor = 1;

    if (activityData.activityType === 'cloud_compute') {
      const computeActivity = activityData as CloudComputeActivity;
      serverCount = Math.max(1, Math.ceil((computeActivity.metadata.vcpuCount || 1) / 4));
      networkingFactor = computeActivity.metadata.vcpuCount ? computeActivity.metadata.vcpuCount / 4 : 1;
    } else if (activityData.activityType === 'storage') {
      const storageActivity = activityData as StorageActivity;
      storageFactor = Math.max(1, storageActivity.metadata.sizeGB / 100);
    } else if (activityData.activityType === 'data_transfer') {
      const transferActivity = activityData as DataTransferActivity;
      networkingFactor = Math.max(1, transferActivity.metadata.bytesTransferred / (1024 * 1024 * 1024));
    }

    const servers = serverEmissions * serverCount;
    const networking = networkEmissions * networkingFactor;
    const storage = storageEmissions * storageFactor;

    return {
      servers,
      networking,
      storage,
      total: servers + networking + storage
    };
  }

  private calculateSoftwareEmissions(activityData: ActivityData): {
    development: number;
    deployment: number;
    maintenance: number;
    total: number;
  } {
    const baseDevelopment = 0.001;
    const baseDeployment = 0.0001;
    const baseMaintenance = 0.00001;

    let complexityFactor = 1;
    
    switch (activityData.activityType) {
      case 'cloud_compute':
        complexityFactor = 1.5;
        break;
      case 'data_transfer':
        complexityFactor = 0.8;
        break;
      case 'storage':
        complexityFactor = 0.6;
        break;
      default:
        complexityFactor = 1;
    }

    const development = baseDevelopment * complexityFactor;
    const deployment = baseDeployment * complexityFactor;
    const maintenance = baseMaintenance * complexityFactor;

    return {
      development,
      deployment,
      maintenance,
      total: development + deployment + maintenance
    };
  }

  private calculateInfrastructureEmissions(activityData: ActivityData): {
    datacenter: number;
    cooling: number;
    powerInfrastructure: number;
    total: number;
  } {
    const baseDatacenter = 0.005;
    const baseCooling = 0.002;
    const basePower = 0.001;

    let scaleFactor = 1;
    
    if (activityData.activityType === 'cloud_compute') {
      const computeActivity = activityData as CloudComputeActivity;
      scaleFactor = Math.max(1, (computeActivity.metadata.vcpuCount || 1) / 2);
    }

    const datacenter = baseDatacenter * scaleFactor;
    const cooling = baseCooling * scaleFactor;
    const powerInfrastructure = basePower * scaleFactor;

    return {
      datacenter,
      cooling,
      powerInfrastructure,
      total: datacenter + cooling + powerInfrastructure
    };
  }

  private getUtilizationRate(activityData: ActivityData): number {
    switch (activityData.activityType) {
      case 'cloud_compute':
        return 0.70;
      case 'storage':
        return 0.85;
      case 'data_transfer':
        return 0.60;
      default:
        return 0.65;
    }
  }

  private calculateTimeShare(activityData: ActivityData): number {
    let durationHours = 1;

    if (activityData.activityType === 'cloud_compute') {
      const computeActivity = activityData as CloudComputeActivity;
      durationHours = computeActivity.metadata.duration / 3600;
    } else if (activityData.activityType === 'storage') {
      const storageActivity = activityData as StorageActivity;
      durationHours = storageActivity.metadata.duration / 3600;
    }

    return Math.min(1, durationHours);
  }

  private determineFunctionalUnit(activityData: ActivityData): FunctionalUnitSpec {
    switch (activityData.activityType) {
      case 'cloud_compute':
        const computeActivity = activityData as CloudComputeActivity;
        return {
          type: 'computation_cycle',
          value: Math.max(1, (computeActivity.metadata.vcpuCount || 1) * (computeActivity.metadata.duration || 3600) / 3600),
          unit: 'vCPU-hours',
          description: 'Virtual CPU hours of computation'
        };
      
      case 'data_transfer':
        const transferActivity = activityData as DataTransferActivity;
        return {
          type: 'data_processed',
          value: Math.max(1, transferActivity.metadata.bytesTransferred / (1024 * 1024)),
          unit: 'MB transferred',
          description: 'Megabytes of data transferred'
        };
      
      case 'storage':
        const storageActivity = activityData as StorageActivity;
        return {
          type: 'data_processed',
          value: Math.max(1, (storageActivity.metadata.sizeGB * storageActivity.metadata.duration) / 3600),
          unit: 'GB-hours',
          description: 'Gigabyte-hours of storage'
        };
      
      default:
        return {
          type: 'request',
          value: 1,
          unit: 'operation',
          description: 'Single operation or request'
        };
    }
  }

  private calculateSCIRating(sciValue: number, activityType: string): 'A' | 'B' | 'C' | 'D' | 'E' {
    const thresholds = this.getSCIThresholds(activityType);
    
    if (sciValue <= thresholds.A) return 'A';
    if (sciValue <= thresholds.B) return 'B';
    if (sciValue <= thresholds.C) return 'C';
    if (sciValue <= thresholds.D) return 'D';
    return 'E';
  }

  private getSCIThresholds(activityType: string): Record<'A' | 'B' | 'C' | 'D', number> {
    const thresholds: Record<string, Record<'A' | 'B' | 'C' | 'D', number>> = {
      'cloud_compute': {
        A: 0.001,  // gCO2eq per vCPU-hour
        B: 0.005,
        C: 0.01,
        D: 0.05
      },
      'data_transfer': {
        A: 0.0001, // gCO2eq per MB
        B: 0.0005,
        C: 0.001,
        D: 0.005
      },
      'storage': {
        A: 0.00001, // gCO2eq per GB-hour
        B: 0.00005,
        C: 0.0001,
        D: 0.0005
      }
    };
    
    return thresholds[activityType] || thresholds['cloud_compute'];
  }

  public updateConfig(newConfig: Partial<SCIConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    logger.info('SCI compliance config updated', {
      metadata: { config: this.config }
    });
  }

  public getConfig(): SCIConfig {
    return { ...this.config };
  }

  public async validateSCICompliance(calculation: SCICalculation): Promise<{
    isCompliant: boolean;
    issues: string[];
    recommendations: string[];
    complianceScore: number;
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!calculation.methodology.marginal) {
      issues.push('Should use marginal emission factors for accurate SCI calculation');
      recommendations.push('Enable marginal emission factors in SCI configuration');
    }

    if (calculation.methodology.temporal !== 'real_time') {
      issues.push('Should use real-time temporal resolution for optimal accuracy');
      recommendations.push('Configure hourly temporal resolution');
    }

    if (calculation.components.embodied === 0) {
      issues.push('Embodied emissions not included in calculation');
      recommendations.push('Enable embodied emissions calculation for full SCI compliance');
    }

    if (calculation.sciRating === 'E') {
      issues.push('SCI rating is very poor (E), significant optimization needed');
      recommendations.push('Consider optimizing energy efficiency and switching to cleaner energy sources');
    } else if (calculation.sciRating === 'D') {
      issues.push('SCI rating is poor (D), optimization recommended');
      recommendations.push('Implement energy efficiency measures and consider renewable energy');
    }

    const complianceScore = Math.max(0, 1 - (issues.length * 0.2));
    const isCompliant = issues.length === 0;

    return {
      isCompliant,
      issues,
      recommendations,
      complianceScore
    };
  }
}

export const sciComplianceService = new SCIComplianceService();
export { SCIComplianceService };