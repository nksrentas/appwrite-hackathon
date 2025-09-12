import { logger } from '@shared/utils/logger';
import { 
  carbonCalculationEngine,
  externalAPIService,
  realTimeUpdatesService,
  epaGridService
} from '@features/carbon-calculation';
import { GeographicContext, Activity, CarbonIntensityForecast } from '@features/carbon-insights/types';

export class CarbonCalculationIntegrationService {
  private static instance: CarbonCalculationIntegrationService;
  private carbonEngine: typeof carbonCalculationEngine;
  private externalAPIs: typeof externalAPIService;
  private realTimeUpdates: typeof realTimeUpdatesService;
  private epaGrid: typeof epaGridService;

  private constructor() {
    this.carbonEngine = carbonCalculationEngine;
    this.externalAPIs = externalAPIService;
    this.realTimeUpdates = realTimeUpdatesService;
    this.epaGrid = epaGridService;
  }

  public static getInstance(): CarbonCalculationIntegrationService {
    if (!CarbonCalculationIntegrationService.instance) {
      CarbonCalculationIntegrationService.instance = new CarbonCalculationIntegrationService();
    }
    return CarbonCalculationIntegrationService.instance;
  }

  async getCurrentCarbonIntensity(latitude: number, longitude: number): Promise<number> {
    try {
      const zone = this.getZoneFromCoordinates(latitude, longitude);
      
      const gridData = await this.externalAPIs.getElectricityMapsData(zone);
      
      if (gridData && gridData.carbonIntensity) {
        return gridData.carbonIntensity;
      }

      if (latitude > 24 && latitude < 50 && longitude > -125 && longitude < -66) {
        const postalCode = this.getPostalCodeFromCoordinates(latitude, longitude);
        if (postalCode) {
          const epaData = await this.epaGrid.getEmissionFactorByPostalCode(postalCode);
          if (epaData) {
            return epaData.emissionRate;
          }
        }
      }

      logger.warn('Could not get carbon intensity data, using default', { 
        metadata: { latitude, longitude, zone } 
      });
      return 400;

    } catch (error: any) {
      logger.error('Failed to get current carbon intensity', { 
        metadata: { latitude, longitude },
        error: { code: 'CARBON_INTENSITY_ERROR', message: error.message }
      });
      return 400;
    }
  }

  async getCarbonIntensityForecast(
    latitude: number, 
    longitude: number, 
    hours: number = 24
  ): Promise<CarbonIntensityForecast[]> {
    try {
      const currentIntensity = await this.getCurrentCarbonIntensity(latitude, longitude);
      const renewablePercentage = await this.getRenewableEnergyPercentage(latitude, longitude);
      
      return this.generateForecastFromCurrentData(currentIntensity, renewablePercentage, hours);

    } catch (error: any) {
      logger.error('Failed to get carbon intensity forecast', { 
        metadata: { latitude, longitude, hours },
        error: { code: 'FORECAST_ERROR', message: error.message }
      });
      return this.generateSyntheticForecast(hours);
    }
  }

  async calculateActivityCarbonFootprint(
    activityType: string,
    duration: number, // minutes
    location: { latitude: number; longitude: number; country: string },
    metadata: any = {}
  ): Promise<number> {
    try {
      const calculationData = this.mapActivityToCalculationData(
        activityType, 
        duration, 
        location, 
        metadata
      );

      const result = await this.carbonEngine.calculateCarbon(calculationData);
      
      return result.carbonKg || 0;

    } catch (error: any) {
      logger.error('Failed to calculate activity carbon footprint', { 
        metadata: { activityType, duration, location },
        error: { code: 'FOOTPRINT_CALC_ERROR', message: error.message }
      });
      
      return this.getFallbackCarbonFootprint(activityType, duration);
    }
  }

  async getRenewableEnergyPercentage(latitude: number, longitude: number): Promise<number> {
    try {
      const zone = this.getZoneFromCoordinates(latitude, longitude);
      
      const gridData = await this.externalAPIs.getElectricityMapsData(zone);
      
      if (gridData && gridData.renewablePercentage !== undefined) {
        return gridData.renewablePercentage;
      }

      return this.getDefaultRenewablePercentage(latitude, longitude);

    } catch (error: any) {
      logger.error('Failed to get renewable energy percentage', { 
        metadata: { latitude, longitude },
        error: { code: 'RENEWABLE_ERROR', message: error.message }
      });
      return this.getDefaultRenewablePercentage(latitude, longitude);
    }
  }

  async getGridRegion(latitude: number, longitude: number): Promise<string> {
    try {
      return this.getSimpleGridRegion(latitude, longitude);

    } catch (error: any) {
      logger.error('Failed to get grid region', { 
        metadata: { latitude, longitude },
        error: { code: 'GRID_REGION_ERROR', message: error.message }
      });
      return this.getSimpleGridRegion(latitude, longitude);
    }
  }

  async subscribeToRealTimeUpdates(
    userId: string,
    latitude: number, 
    longitude: number,
    callback: (data: { carbonIntensity: number; timestamp: Date }) => void
  ): Promise<void> {
    try {
      const regions = [this.getZoneFromCoordinates(latitude, longitude)];
      
      this.realTimeUpdates.addSubscription(userId, {
        userId,
        regions,
        sources: ['Electricity_Maps', 'EPA_eGRID'],
        minChangeThreshold: 5,
        callback: (update) => {
          callback({
            carbonIntensity: update.newValue * 1000,
            timestamp: new Date(update.timestamp)
          });
        }
      });
      
      logger.info('Subscribed to real-time carbon intensity updates', { 
        metadata: { userId, latitude, longitude, regions }
      });
    } catch (error: any) {
      logger.error('Failed to subscribe to real-time updates', { 
        metadata: { userId },
        error: { code: 'SUBSCRIPTION_ERROR', message: error.message }
      });
    }
  }

  async unsubscribeFromRealTimeUpdates(userId: string): Promise<void> {
    try {
      this.realTimeUpdates.removeSubscription(userId);
      
      logger.info('Unsubscribed from real-time carbon intensity updates', { 
        metadata: { userId }
      });
    } catch (error: any) {
      logger.error('Failed to unsubscribe from real-time updates', { 
        metadata: { userId },
        error: { code: 'UNSUBSCRIBE_ERROR', message: error.message }
      });
    }
  }

  validateActivityData(activity: Activity): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!activity.userId) {
      errors.push('User ID is required');
    }

    if (!activity.type) {
      errors.push('Activity type is required');
    }

    if (!activity.duration || activity.duration <= 0) {
      errors.push('Duration must be greater than 0');
    }

    if (!activity.location || !activity.location.latitude || !activity.location.longitude) {
      errors.push('Valid location coordinates are required');
    }

    if (!activity.timestamp) {
      errors.push('Timestamp is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private generateSyntheticForecast(hours: number): CarbonIntensityForecast[] {
    const forecast: CarbonIntensityForecast[] = [];
    const baseIntensity = 350;

    for (let i = 1; i <= hours; i++) {
      const timestamp = new Date(Date.now() + i * 60 * 60 * 1000);
      const hour = timestamp.getHours();
      
      let intensity = baseIntensity;
      if (hour >= 2 && hour <= 6) intensity *= 0.8;
      if (hour >= 11 && hour <= 15) intensity *= 0.9;
      if (hour >= 18 && hour <= 21) intensity *= 1.2;
      
      forecast.push({
        timestamp,
        intensity: Math.round(intensity + (Math.random() - 0.5) * 50),
        confidence: Math.max(0.6, 0.9 - i * 0.01),
        renewablePercentage: 40 + Math.sin((hour - 12) * Math.PI / 12) * 15
      });
    }

    return forecast;
  }

  private mapActivityToCalculationData(
    activityType: string,
    duration: number,
    location: any,
    metadata: any
  ): any {
    const baseActivity = {
      activityType: 'cloud_compute',
      location: {
        country: location.country,
        region: location.country,
        postalCode: undefined
      },
      timestamp: new Date().toISOString()
    };

    switch (activityType) {
      case 'build':
      case 'test':
      case 'code':
        return {
          ...baseActivity,
          metadata: {
            provider: 'generic',
            region: location.country,
            duration: duration * 60,
            instanceType: 'medium',
            memoryGbHours: 4
          }
        };
      case 'deploy':
        return {
          ...baseActivity,
          activityType: 'deployment',
          metadata: {
            deploymentSize: metadata?.deploymentSize || 0.5,
            duration: duration * 60
          }
        };
      default:
        return {
          ...baseActivity,
          metadata: {
            provider: 'generic',
            region: location.country,
            duration: duration * 60,
            instanceType: 'medium'
          }
        };
    }
  }

  private getFallbackCarbonFootprint(activityType: string, duration: number): number {
    const rates = {
      'build': 0.5,
      'test': 0.3,
      'deploy': 0.1,
      'code': 0.05,
      'meeting': 0.02,
      'research': 0.03
    };

    const ratePerHour = rates[activityType] || 0.1;
    return (duration / 60) * ratePerHour;
  }

  private getDefaultRenewablePercentage(latitude: number, longitude: number): number {
    if (latitude > 60) return 80;
    if (latitude > 45 && longitude < -70) return 65;
    if (latitude > 35 && latitude < 45 && longitude > -10 && longitude < 30) return 30;
    if (latitude > 25 && latitude < 50 && longitude < -70) return 20;
    
    return 40;
  }

  private getSimpleGridRegion(latitude: number, longitude: number): string {
    if (latitude > 32 && latitude < 42 && longitude > -125 && longitude < -114) {
      return 'CAISO';
    }
    if (latitude > 25 && latitude < 36 && longitude > -106 && longitude < -93) {
      return 'ERCOT';
    }
    if (latitude > 36 && latitude < 48 && longitude > -83 && longitude < -75) {
      return 'PJM';
    }
    
    return 'UNKNOWN';
  }

  private getZoneFromCoordinates(latitude: number, longitude: number): string {
    if (latitude > 32 && latitude < 42 && longitude > -125 && longitude < -114) {
      return 'US-CA';
    }
    if (latitude > 25 && latitude < 36 && longitude > -106 && longitude < -93) {
      return 'US-TX';
    }
    if (latitude > 40 && latitude < 45 && longitude > -79 && longitude < -71) {
      return 'US-NY';
    }
    if (latitude > 49 && latitude < 61 && longitude > -8 && longitude < 2) {
      return 'GB';
    }
    if (latitude > 47 && latitude < 55 && longitude > 5 && longitude < 15) {
      return 'DE';
    }
    if (latitude > 42 && latitude < 51 && longitude > -5 && longitude < 8) {
      return 'FR';
    }
    if (latitude > 30 && latitude < 46 && longitude > 129 && longitude < 146) {
      return 'JP';
    }
    if (latitude > -44 && latitude < -10 && longitude > 113 && longitude < 154) {
      return 'AU';
    }
    
    if (latitude > 24 && latitude < 50 && longitude > -125 && longitude < -66) {
      return 'US';
    }
    
    return 'DE';
  }

  private getPostalCodeFromCoordinates(latitude: number, longitude: number): string | null {
    if (latitude > 37 && latitude < 38 && longitude > -123 && longitude < -122) {
      return '94102';
    }
    if (latitude > 40 && latitude < 41 && longitude > -74 && longitude < -73) {
      return '10001';
    }
    if (latitude > 29 && latitude < 30 && longitude > -96 && longitude < -95) {
      return '77002';
    }
    
    return null;
  }

  private generateForecastFromCurrentData(
    currentIntensity: number,
    renewablePercentage: number,
    hours: number
  ): CarbonIntensityForecast[] {
    const forecast: CarbonIntensityForecast[] = [];
    
    for (let i = 1; i <= hours; i++) {
      const timestamp = new Date(Date.now() + i * 60 * 60 * 1000);
      const hour = timestamp.getHours();
      
      let intensity = currentIntensity;
      if (hour >= 2 && hour <= 6) {
        intensity *= (100 - renewablePercentage) / 100 + 0.1;
      }
      if (hour >= 11 && hour <= 15) {
        intensity *= (100 - renewablePercentage) / 100 - 0.1;
      }
      if (hour >= 18 && hour <= 21) {
        intensity *= (100 - renewablePercentage) / 100 + 0.2;
      }
      
      forecast.push({
        timestamp,
        intensity: Math.max(50, Math.round(intensity + (Math.random() - 0.5) * 50)),
        confidence: Math.max(0.6, 0.9 - i * 0.01),
        renewablePercentage: Math.max(0, Math.min(100, renewablePercentage + (Math.random() - 0.5) * 10))
      });
    }

    return forecast;
  }
}

export const carbonCalculationIntegration = CarbonCalculationIntegrationService.getInstance();