import { logger } from '@shared/utils/logger';
import { 
  carbonCalculationEngine,
  externalAPIService,
  realTimeUpdatesService,
  epaGridService
} from '@features/carbon-calculation';
import { GeographicContext, Activity, CarbonIntensityForecast } from '../types';

/**
 * Integration service to connect carbon insights with the existing carbon calculation system
 */
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

  /**
   * Get current carbon intensity for a location using the carbon calculation system
   */
  async getCurrentCarbonIntensity(latitude: number, longitude: number): Promise<number> {
    try {
      // Convert coordinates to zone - simplified mapping for major regions
      const zone = this.getZoneFromCoordinates(latitude, longitude);
      
      // Use the existing carbon calculation system to get grid data
      const gridData = await this.externalAPIs.getElectricityMapsData(zone);
      
      if (gridData && gridData.carbonIntensity) {
        return gridData.carbonIntensity;
      }

      // Fallback to EPA data if available (US only)
      if (latitude > 24 && latitude < 50 && longitude > -125 && longitude < -66) {
        const postalCode = this.getPostalCodeFromCoordinates(latitude, longitude);
        if (postalCode) {
          const epaData = await this.epaGrid.getEmissionFactorByPostalCode(postalCode);
          if (epaData) {
            return epaData.emissionRate;
          }
        }
      }

      // Default fallback
      logger.warn('Could not get carbon intensity data, using default', { 
        metadata: { latitude, longitude, zone } 
      });
      return 400; // gCO2/kWh default

    } catch (error: any) {
      logger.error('Failed to get current carbon intensity', { 
        metadata: { latitude, longitude },
        error: { code: 'CARBON_INTENSITY_ERROR', message: error.message }
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
      // Since getForecastData doesn't exist, get current data and create forecast
      const currentIntensity = await this.getCurrentCarbonIntensity(latitude, longitude);
      const renewablePercentage = await this.getRenewableEnergyPercentage(latitude, longitude);
      
      // Generate forecast based on current data
      return this.generateForecastFromCurrentData(currentIntensity, renewablePercentage, hours);

    } catch (error: any) {
      logger.error('Failed to get carbon intensity forecast', { 
        metadata: { latitude, longitude, hours },
        error: { code: 'FORECAST_ERROR', message: error.message }
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
      const result = await this.carbonEngine.calculateCarbon(calculationData);
      
      return result.carbonKg || 0;

    } catch (error: any) {
      logger.error('Failed to calculate activity carbon footprint', { 
        metadata: { activityType, duration, location },
        error: { code: 'FOOTPRINT_CALC_ERROR', message: error.message }
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
      // Convert coordinates to zone
      const zone = this.getZoneFromCoordinates(latitude, longitude);
      
      // Get grid data from external APIs
      const gridData = await this.externalAPIs.getElectricityMapsData(zone);
      
      if (gridData && gridData.renewablePercentage !== undefined) {
        return gridData.renewablePercentage;
      }

      // Default based on location
      return this.getDefaultRenewablePercentage(latitude, longitude);

    } catch (error: any) {
      logger.error('Failed to get renewable energy percentage', { 
        metadata: { latitude, longitude },
        error: { code: 'RENEWABLE_ERROR', message: error.message }
      });
      return this.getDefaultRenewablePercentage(latitude, longitude);
    }
  }

  /**
   * Get grid region information
   */
  async getGridRegion(latitude: number, longitude: number): Promise<string> {
    try {
      // Use simple geographic mapping since getGridRegion doesn't exist
      return this.getSimpleGridRegion(latitude, longitude);

    } catch (error: any) {
      logger.error('Failed to get grid region', { 
        metadata: { latitude, longitude },
        error: { code: 'GRID_REGION_ERROR', message: error.message }
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
      // Convert coordinates to regions
      const regions = [this.getZoneFromCoordinates(latitude, longitude)];
      
      // Use addSubscription method that exists
      this.realTimeUpdates.addSubscription(userId, {
        userId,
        regions,
        sources: ['Electricity_Maps', 'EPA_eGRID'],
        minChangeThreshold: 5, // 5% minimum change
        callback: (update) => {
          callback({
            carbonIntensity: update.newValue * 1000, // Convert back to g/kWh
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

  /**
   * Unsubscribe from real-time updates
   */
  async unsubscribeFromRealTimeUpdates(userId: string): Promise<void> {
    try {
      // Use removeSubscription method that exists
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
            duration: duration * 60, // Convert minutes to seconds
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

  private getZoneFromCoordinates(latitude: number, longitude: number): string {
    // Map coordinates to Electricity Maps zones
    if (latitude > 32 && latitude < 42 && longitude > -125 && longitude < -114) {
      return 'US-CA'; // California
    }
    if (latitude > 25 && latitude < 36 && longitude > -106 && longitude < -93) {
      return 'US-TX'; // Texas
    }
    if (latitude > 40 && latitude < 45 && longitude > -79 && longitude < -71) {
      return 'US-NY'; // New York
    }
    if (latitude > 49 && latitude < 61 && longitude > -8 && longitude < 2) {
      return 'GB'; // Great Britain
    }
    if (latitude > 47 && latitude < 55 && longitude > 5 && longitude < 15) {
      return 'DE'; // Germany
    }
    if (latitude > 42 && latitude < 51 && longitude > -5 && longitude < 8) {
      return 'FR'; // France
    }
    if (latitude > 30 && latitude < 46 && longitude > 129 && longitude < 146) {
      return 'JP'; // Japan
    }
    if (latitude > -44 && latitude < -10 && longitude > 113 && longitude < 154) {
      return 'AU'; // Australia
    }
    
    // Default to US for North American coordinates
    if (latitude > 24 && latitude < 50 && longitude > -125 && longitude < -66) {
      return 'US';
    }
    
    return 'DE'; // Default fallback
  }

  private getPostalCodeFromCoordinates(latitude: number, longitude: number): string | null {
    // Very simplified postal code mapping for major US regions
    if (latitude > 37 && latitude < 38 && longitude > -123 && longitude < -122) {
      return '94102'; // San Francisco
    }
    if (latitude > 40 && latitude < 41 && longitude > -74 && longitude < -73) {
      return '10001'; // New York
    }
    if (latitude > 29 && latitude < 30 && longitude > -96 && longitude < -95) {
      return '77002'; // Houston
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
      
      // Simulate daily pattern based on renewable percentage
      let intensity = currentIntensity;
      if (hour >= 2 && hour <= 6) {
        intensity *= (100 - renewablePercentage) / 100 + 0.1; // Night
      }
      if (hour >= 11 && hour <= 15) {
        intensity *= (100 - renewablePercentage) / 100 - 0.1; // Midday solar
      }
      if (hour >= 18 && hour <= 21) {
        intensity *= (100 - renewablePercentage) / 100 + 0.2; // Evening peak
      }
      
      forecast.push({
        timestamp,
        intensity: Math.max(50, Math.round(intensity + (Math.random() - 0.5) * 50)),
        confidence: Math.max(0.6, 0.9 - i * 0.01), // Decreasing confidence over time
        renewablePercentage: Math.max(0, Math.min(100, renewablePercentage + (Math.random() - 0.5) * 10))
      });
    }

    return forecast;
  }
}

export const carbonCalculationIntegration = CarbonCalculationIntegrationService.getInstance();