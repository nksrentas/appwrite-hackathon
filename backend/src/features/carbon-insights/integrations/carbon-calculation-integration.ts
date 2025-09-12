import { logger } from '@shared/utils/logger';
import { 
  carbonCalculationEngine,
  ExternalAPIIntegrations,
  RealTimeEmissionUpdatesService 
} from '@features/carbon-calculation';
import { GeographicContext, Activity, CarbonIntensityForecast } from '../types';

/**
 * Integration service to connect carbon insights with the existing carbon calculation system
 */
export class CarbonCalculationIntegrationService {
  private static instance: CarbonCalculationIntegrationService;
  private carbonEngine: typeof carbonCalculationEngine;
  private externalAPIs: ExternalAPIIntegrations;
  private realTimeUpdates: RealTimeEmissionUpdatesService;

  private constructor() {
    this.carbonEngine = carbonCalculationEngine;
    this.externalAPIs = ExternalAPIIntegrations.getInstance();
    this.realTimeUpdates = RealTimeEmissionUpdatesService.getInstance();
  }

  public static getInstance(): CarbonCalculationIntegrationService {
    if (!CarbonCalculationIntegrationService.instance) {
      CarbonCalculationIntegrationService.instance = new CarbonCalculationIntegrationService();
    }
    return CarbonCalculationIntegrationService.instance;
  }

  /**
   * Get current carbon intensity for a location using the carbon calculation system
   */
  async getCurrentCarbonIntensity(latitude: number, longitude: number): Promise<number> {
    try {
      // Use the existing carbon calculation system to get grid data
      const gridData = await this.externalAPIs.getElectricityMapsData(latitude, longitude);
      
      if (gridData && gridData.carbonIntensity) {
        return gridData.carbonIntensity;
      }

      // Fallback to EPA data if available
      const epaData = await this.externalAPIs.getEPAGridData(latitude, longitude);
      if (epaData && epaData.carbonIntensity) {
        return epaData.carbonIntensity;
      }

      // Default fallback
      logger.warn('Could not get carbon intensity data, using default', { latitude, longitude });
      return 400; // gCO2/kWh default

    } catch (error) {
      logger.error('Failed to get current carbon intensity', { 
        latitude, 
        longitude, 
        error: error.message 
      });
      return 400; // Default fallback
    }
  }

  /**
   * Get carbon intensity forecast using real-time updates service
   */
  async getCarbonIntensityForecast(
    latitude: number, 
    longitude: number, 
    hours: number = 24
  ): Promise<CarbonIntensityForecast[]> {
    try {
      // Use real-time updates service for forecast data
      const forecastData = await this.realTimeUpdates.getForecastData(latitude, longitude, hours);
      
      if (forecastData && forecastData.length > 0) {
        return forecastData.map(item => ({
          timestamp: new Date(item.timestamp),
          intensity: item.carbonIntensity,
          confidence: item.confidence || 0.8,
          renewablePercentage: item.renewablePercentage || 50
        }));
      }

      // Generate synthetic forecast if no data available
      return this.generateSyntheticForecast(hours);

    } catch (error) {
      logger.error('Failed to get carbon intensity forecast', { 
        latitude, 
        longitude, 
        hours,
        error: error.message 
      });
      return this.generateSyntheticForecast(hours);
    }
  }

  /**
   * Calculate carbon footprint for activities using the carbon calculation engine
   */
  async calculateActivityCarbonFootprint(
    activityType: string,
    duration: number, // minutes
    location: { latitude: number; longitude: number; country: string },
    metadata: any = {}
  ): Promise<number> {
    try {
      // Map activity types to carbon calculation engine types
      const calculationData = this.mapActivityToCalculationData(
        activityType, 
        duration, 
        location, 
        metadata
      );

      // Use the carbon calculation engine
      const result = await this.carbonEngine.calculateCarbonFootprint(calculationData);
      
      return result.totalEmissions || 0;

    } catch (error) {
      logger.error('Failed to calculate activity carbon footprint', { 
        activityType,
        duration,
        location,
        error: error.message 
      });
      
      // Fallback calculation
      return this.getFallbackCarbonFootprint(activityType, duration);
    }
  }

  /**
   * Get renewable energy percentage for a location
   */
  async getRenewableEnergyPercentage(latitude: number, longitude: number): Promise<number> {
    try {
      // Get grid data from external APIs
      const gridData = await this.externalAPIs.getElectricityMapsData(latitude, longitude);
      
      if (gridData && gridData.renewablePercentage !== undefined) {
        return gridData.renewablePercentage;
      }

      // Fallback to EPA data
      const epaData = await this.externalAPIs.getEPAGridData(latitude, longitude);
      if (epaData && epaData.renewablePercentage !== undefined) {
        return epaData.renewablePercentage;
      }

      // Default based on location
      return this.getDefaultRenewablePercentage(latitude, longitude);

    } catch (error) {
      logger.error('Failed to get renewable energy percentage', { 
        latitude, 
        longitude, 
        error: error.message 
      });
      return this.getDefaultRenewablePercentage(latitude, longitude);
    }
  }

  /**
   * Get grid region information
   */
  async getGridRegion(latitude: number, longitude: number): Promise<string> {
    try {
      // Use the carbon calculation system's geographic mapping
      const regionData = await this.externalAPIs.getGridRegion(latitude, longitude);
      
      if (regionData && regionData.region) {
        return regionData.region;
      }

      // Fallback to simple geographic mapping
      return this.getSimpleGridRegion(latitude, longitude);

    } catch (error) {
      logger.error('Failed to get grid region', { 
        latitude, 
        longitude, 
        error: error.message 
      });
      return this.getSimpleGridRegion(latitude, longitude);
    }
  }

  /**
   * Subscribe to real-time carbon intensity updates
   */
  async subscribeToRealTimeUpdates(
    userId: string,
    latitude: number, 
    longitude: number,
    callback: (data: { carbonIntensity: number; timestamp: Date }) => void
  ): Promise<void> {
    try {
      await this.realTimeUpdates.subscribe(
        `user:${userId}`,
        { latitude, longitude },
        callback
      );
      
      logger.info('Subscribed to real-time carbon intensity updates', { userId });
    } catch (error) {
      logger.error('Failed to subscribe to real-time updates', { 
        userId,
        error: error.message 
      });
    }
  }

  /**
   * Unsubscribe from real-time updates
   */
  async unsubscribeFromRealTimeUpdates(userId: string): Promise<void> {
    try {
      await this.realTimeUpdates.unsubscribe(`user:${userId}`);
      
      logger.info('Unsubscribed from real-time carbon intensity updates', { userId });
    } catch (error) {
      logger.error('Failed to unsubscribe from real-time updates', { 
        userId,
        error: error.message 
      });
    }
  }

  /**
   * Validate activity data against carbon calculation requirements
   */
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

  /**
   * Private helper methods
   */
  private generateSyntheticForecast(hours: number): CarbonIntensityForecast[] {
    const forecast: CarbonIntensityForecast[] = [];
    const baseIntensity = 350; // gCO2/kWh

    for (let i = 1; i <= hours; i++) {
      const timestamp = new Date(Date.now() + i * 60 * 60 * 1000);
      const hour = timestamp.getHours();
      
      // Simulate daily pattern
      let intensity = baseIntensity;
      if (hour >= 2 && hour <= 6) intensity *= 0.8; // Night
      if (hour >= 11 && hour <= 15) intensity *= 0.9; // Midday solar
      if (hour >= 18 && hour <= 21) intensity *= 1.2; // Evening peak
      
      forecast.push({
        timestamp,
        intensity: Math.round(intensity + (Math.random() - 0.5) * 50),
        confidence: Math.max(0.6, 0.9 - i * 0.01), // Decreasing confidence over time
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
    // Map activity types to carbon calculation engine format
    const activityMapping = {
      'build': {
        type: 'computation',
        computeHours: duration / 60,
        location: location.country
      },
      'test': {
        type: 'computation',
        computeHours: duration / 60 * 0.7, // Tests typically use less resources
        location: location.country
      },
      'deploy': {
        type: 'network',
        dataTransferGB: metadata?.deploymentSize || 0.5,
        location: location.country
      },
      'code': {
        type: 'computation',
        computeHours: duration / 60 * 0.3, // Coding uses minimal compute
        location: location.country
      }
    };

    return activityMapping[activityType] || {
      type: 'computation',
      computeHours: duration / 60,
      location: location.country
    };
  }

  private getFallbackCarbonFootprint(activityType: string, duration: number): number {
    // Fallback carbon footprint estimates in kg CO2e
    const rates = {
      'build': 0.5,    // kg CO2e per hour
      'test': 0.3,     // kg CO2e per hour
      'deploy': 0.1,   // kg CO2e per hour
      'code': 0.05,    // kg CO2e per hour
      'meeting': 0.02, // kg CO2e per hour
      'research': 0.03 // kg CO2e per hour
    };

    const ratePerHour = rates[activityType] || 0.1;
    return (duration / 60) * ratePerHour;
  }

  private getDefaultRenewablePercentage(latitude: number, longitude: number): number {
    // Simple regional defaults for renewable energy percentage
    if (latitude > 60) return 80; // Nordic countries
    if (latitude > 45 && longitude < -70) return 65; // Canada
    if (latitude > 35 && latitude < 45 && longitude > -10 && longitude < 30) return 30; // Europe
    if (latitude > 25 && latitude < 50 && longitude < -70) return 20; // US
    
    return 40; // Global average
  }

  private getSimpleGridRegion(latitude: number, longitude: number): string {
    // Simple grid region mapping
    if (latitude > 32 && latitude < 42 && longitude > -125 && longitude < -114) {
      return 'CAISO'; // California
    }
    if (latitude > 25 && latitude < 36 && longitude > -106 && longitude < -93) {
      return 'ERCOT'; // Texas
    }
    if (latitude > 36 && latitude < 48 && longitude > -83 && longitude < -75) {
      return 'PJM'; // PJM Interconnection
    }
    
    return 'UNKNOWN';
  }
}

export const carbonCalculationIntegration = CarbonCalculationIntegrationService.getInstance();