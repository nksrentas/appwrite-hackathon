import { Server as SocketServer } from 'socket.io';
import * as cron from 'node-cron';
import { 
  EmissionFactor// , 
  // DataSource, 
  // EPAGridData, 
  // ElectricityMapsData, 
  // AWSCarbonData 
} from '@features/carbon-calculation/types';
import { epaGridService } from '@features/carbon-calculation/integrations/epa-egrid';
import { externalAPIService } from '@features/carbon-calculation/integrations/external-apis';
import { logger } from '@shared/utils/logger';
import { CacheService } from '@shared/utils/cache';

interface EmissionFactorUpdate {
  factorId: string;
  source: string;
  oldValue: number;
  newValue: number;
  change: number;
  changePercent: number;
  timestamp: string;
  region?: string;
  impactScope: 'low' | 'medium' | 'high';
}

interface UpdateSubscription {
  userId?: string;
  regions: string[];
  sources: string[];
  minChangeThreshold: number;
  callback?: (update: EmissionFactorUpdate) => void;
}

interface RealTimeMetrics {
  updateCount: number;
  lastUpdateTime: string;
  averageChangePercent: number;
  activeSubscriptions: number;
  dataFreshness: Record<string, number>;
}

class RealTimeEmissionUpdatesService {
  private io: SocketServer | null = null;
  private cache: CacheService;
  private subscriptions: Map<string, UpdateSubscription> = new Map();
  private currentFactors: Map<string, EmissionFactor> = new Map();
  private updateQueue: EmissionFactorUpdate[] = [];
  private metrics: RealTimeMetrics;
  private isEnabled: boolean = true;

  constructor() {
    this.cache = new CacheService();
    this.metrics = {
      updateCount: 0,
      lastUpdateTime: new Date().toISOString(),
      averageChangePercent: 0,
      activeSubscriptions: 0,
      dataFreshness: {}
    };

    this.initializeScheduledUpdates();
    this.loadInitialFactors();
  }

  public initialize(io: SocketServer): void {
    this.io = io;
    this.setupSocketHandlers();
    logger.info('Real-time emission updates service initialized');
  }

  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      logger.debug('Client connected to real-time updates', {
        metadata: {
          socketId: socket.id
        }
      });

      socket.on('subscribe_emission_updates', (subscription: UpdateSubscription) => {
        this.addSubscription(socket.id, subscription);
      });

      socket.on('unsubscribe_emission_updates', () => {
        this.removeSubscription(socket.id);
      });

      socket.on('request_current_factors', (regions: string[]) => {
        this.sendCurrentFactors(socket, regions);
      });

      socket.on('disconnect', () => {
        this.removeSubscription(socket.id);
        logger.debug('Client disconnected from real-time updates', {
          metadata: {
            socketId: socket.id
          }
        });
      });
    });
  }

  private initializeScheduledUpdates(): void {
    cron.schedule('*/15 * * * *', async () => {
      if (this.isEnabled) {
        await this.performScheduledUpdate('electricity_maps');
      }
    });

    cron.schedule('0 * * * *', async () => {
      if (this.isEnabled) {
        await this.performScheduledUpdate('aws_carbon');
      }
    });

    cron.schedule('0 */6 * * *', async () => {
      if (this.isEnabled) {
        await this.performScheduledUpdate('epa_egrid');
      }
    });

    cron.schedule('0 0 */7 * *', async () => {
      if (this.isEnabled) {
        await this.performBatchRecalculation();
      }
    });

    logger.info('Real-time update schedulers initialized', {
      metadata: {
        electricityMaps: 'Every 15 minutes',
        awsCarbon: 'Hourly',
        epaGrid: 'Every 6 hours',
        batchRecalculation: 'Weekly'
      }
    });
  }

  private async loadInitialFactors(): Promise<void> {
    try {
      const cachedFactors = await this.cache.get('current_emission_factors');
      if (cachedFactors) {
        this.currentFactors = new Map(Object.entries(cachedFactors));
        logger.info('Loaded cached emission factors', {
          metadata: {
            factorCount: this.currentFactors.size
          }
        });
      } else {
        await this.refreshAllFactors();
      }
    } catch (error: any) {
      logger.error('Failed to load initial emission factors', {
        error: {
          code: 'INITIAL_FACTORS_LOAD_ERROR',
          message: error.message,
          stack: error.stack
        }
      });
    }
  }

  private async performScheduledUpdate(source: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info(`Performing scheduled update for ${source}`);
      
      const updates: EmissionFactorUpdate[] = [];
      
      switch (source) {
        case 'electricity_maps':
          updates.push(...await this.updateElectricityMapFactors());
          break;
        case 'aws_carbon':
          updates.push(...await this.updateAWSCarbonFactors());
          break;
        case 'epa_egrid':
          updates.push(...await this.updateEPAGridFactors());
          break;
      }
      
      if (updates.length > 0) {
        await this.processUpdates(updates);
        this.metrics.updateCount += updates.length;
        this.metrics.lastUpdateTime = new Date().toISOString();
        this.updateDataFreshness(source);
      }
      
      const duration = Date.now() - startTime;
      logger.info(`Scheduled update completed for ${source}`, {
        metadata: {
          updateCount: updates.length,
          duration: `${duration}ms`
        }
      });
      
    } catch (error: any) {
      logger.error(`Scheduled update failed for ${source}`, {
        error: {
          code: 'SCHEDULED_UPDATE_ERROR',
          message: error.message,
          stack: error.stack
        },
        duration: `${Date.now() - startTime}ms`
      });
    }
  }

  private async updateElectricityMapFactors(): Promise<EmissionFactorUpdate[]> {
    const updates: EmissionFactorUpdate[] = [];
    const zones = ['US-CA', 'US-TX', 'US-NY', 'GB', 'DE', 'FR', 'JP', 'AU'];
    
    for (const zone of zones) {
      try {
        const currentData = await externalAPIService.getElectricityMapsData(zone);
        if (!currentData || currentData.source !== 'real_time') continue;
        
        const factorId = `electricity_maps_${zone}`;
        const currentFactor = this.currentFactors.get(factorId);
        const newValue = currentData.carbonIntensity / 1000;
        
        if (currentFactor && Math.abs(newValue - currentFactor.value) > 0.001) {
          const change = newValue - currentFactor.value;
          const changePercent = (change / currentFactor.value) * 100;
          
          updates.push({
            factorId,
            source: 'Electricity_Maps',
            oldValue: currentFactor.value,
            newValue,
            change,
            changePercent,
            timestamp: currentData.timestamp,
            region: zone,
            impactScope: this.getImpactScope(Math.abs(changePercent))
          });
          
          this.currentFactors.set(factorId, {
            ...currentFactor,
            value: newValue,
            lastUpdated: currentData.timestamp
          });
        } else if (!currentFactor) {
          this.currentFactors.set(factorId, {
            id: factorId,
            name: `Electricity Maps - ${zone}`,
            value: newValue,
            unit: 'kg_CO2_per_kWh',
            source: 'Electricity_Maps',
            region: zone,
            lastUpdated: currentData.timestamp,
            validFrom: currentData.timestamp
          });
        }
      } catch (error: any) {
        logger.warn(`Failed to update electricity maps factor for ${zone}`, {
          error: error.message
        });
      }
    }
    
    return updates;
  }

  private async updateAWSCarbonFactors(): Promise<EmissionFactorUpdate[]> {
    const updates: EmissionFactorUpdate[] = [];
    const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];
    
    for (const region of regions) {
      try {
        const currentData = await externalAPIService.getAWSCarbonData(region, 'ec2');
        if (!currentData) continue;
        
        const factorId = `aws_carbon_${region}`;
        const currentFactor = this.currentFactors.get(factorId);
        const newValue = currentData.carbonIntensity / 1000;
        
        if (currentFactor && Math.abs(newValue - currentFactor.value) > 0.01) {
          const change = newValue - currentFactor.value;
          const changePercent = (change / currentFactor.value) * 100;
          
          updates.push({
            factorId,
            source: 'AWS_Carbon',
            oldValue: currentFactor.value,
            newValue,
            change,
            changePercent,
            timestamp: currentData.timestamp,
            region,
            impactScope: this.getImpactScope(Math.abs(changePercent))
          });
          
          this.currentFactors.set(factorId, {
            ...currentFactor,
            value: newValue,
            lastUpdated: currentData.timestamp
          });
        } else if (!currentFactor) {
          this.currentFactors.set(factorId, {
            id: factorId,
            name: `AWS Carbon - ${region}`,
            value: newValue,
            unit: 'kg_CO2_per_kWh',
            source: 'AWS_Carbon',
            region,
            lastUpdated: currentData.timestamp,
            validFrom: currentData.timestamp
          });
        }
      } catch (error: any) {
        logger.warn(`Failed to update AWS carbon factor for ${region}`, {
          error: error.message
        });
      }
    }
    
    return updates;
  }

  private async updateEPAGridFactors(): Promise<EmissionFactorUpdate[]> {
    const updates: EmissionFactorUpdate[] = [];
    
    try {
      const integrity = await epaGridService.validateDataIntegrity();
      if (!integrity.isValid) {
        logger.warn('EPA eGRID data integrity issues detected', {
          error: {
            code: 'DATA_INTEGRITY_ERROR',
            message: integrity.errors.join(', '),
            stack: undefined
          }
        });
        return updates;
      }
      
      const subregions = epaGridService.getAvailableSubregions();
      
      for (const subregion of subregions) {
        const currentData = await epaGridService.getEmissionFactorByRegion(subregion);
        if (!currentData) continue;
        
        const factorId = `epa_grid_${subregion}`;
        const currentFactor = this.currentFactors.get(factorId);
        const newValue = currentData.emissionRate / 1000;
        
        if (currentFactor && Math.abs(newValue - currentFactor.value) > 0.005) {
          const change = newValue - currentFactor.value;
          const changePercent = (change / currentFactor.value) * 100;
          
          updates.push({
            factorId,
            source: 'EPA_eGRID',
            oldValue: currentFactor.value,
            newValue,
            change,
            changePercent,
            timestamp: currentData.lastUpdated,
            region: subregion,
            impactScope: this.getImpactScope(Math.abs(changePercent))
          });
          
          this.currentFactors.set(factorId, {
            ...currentFactor,
            value: newValue,
            lastUpdated: currentData.lastUpdated
          });
        } else if (!currentFactor) {
          this.currentFactors.set(factorId, {
            id: factorId,
            name: `EPA eGRID - ${subregion}`,
            value: newValue,
            unit: 'kg_CO2_per_kWh',
            source: 'EPA_eGRID',
            region: subregion,
            lastUpdated: currentData.lastUpdated,
            validFrom: currentData.lastUpdated
          });
        }
      }
    } catch (error: any) {
      logger.error('Failed to update EPA eGRID factors', {
        error: error.message
      });
    }
    
    return updates;
  }

  private async processUpdates(updates: EmissionFactorUpdate[]): Promise<void> {
    this.updateQueue.push(...updates);
    
    await this.cache.set('current_emission_factors', 
      Object.fromEntries(this.currentFactors), 
      { ttl: 24 * 60 * 60 * 1000 }
    );
    
    this.broadcastUpdates(updates);
    
    const avgChange = updates.reduce((sum, update) => sum + Math.abs(update.changePercent), 0) / updates.length;
    this.metrics.averageChangePercent = avgChange;
  }

  private broadcastUpdates(updates: EmissionFactorUpdate[]): void {
    if (!this.io) return;
    
    for (const [socketId, subscription] of this.subscriptions) {
      const relevantUpdates = updates.filter(update => 
        this.isUpdateRelevant(update, subscription)
      );
      
      if (relevantUpdates.length > 0) {
        this.io.to(socketId).emit('emission_factor_updates', relevantUpdates);
        
        relevantUpdates.forEach(update => {
          if (subscription.callback) {
            subscription.callback(update);
          }
        });
      }
    }
  }

  private isUpdateRelevant(update: EmissionFactorUpdate, subscription: UpdateSubscription): boolean {
    if (subscription.sources.length > 0 && !subscription.sources.includes(update.source)) {
      return false;
    }
    
    if (subscription.regions.length > 0 && update.region && !subscription.regions.includes(update.region)) {
      return false;
    }
    
    if (Math.abs(update.changePercent) < subscription.minChangeThreshold) {
      return false;
    }
    
    return true;
  }

  private getImpactScope(changePercent: number): 'low' | 'medium' | 'high' {
    if (changePercent >= 20) return 'high';
    if (changePercent >= 5) return 'medium';
    return 'low';
  }

  private updateDataFreshness(source: string): void {
    this.metrics.dataFreshness[source] = Date.now();
  }

  public addSubscription(socketId: string, subscription: UpdateSubscription): void {
    this.subscriptions.set(socketId, subscription);
    this.metrics.activeSubscriptions = this.subscriptions.size;
    
    logger.debug('Added real-time update subscription', {
      metadata: {
        socketId,
        regions: subscription.regions,
        sources: subscription.sources,
        minChangeThreshold: subscription.minChangeThreshold
      }
    });
  }

  public removeSubscription(socketId: string): void {
    this.subscriptions.delete(socketId);
    this.metrics.activeSubscriptions = this.subscriptions.size;
    
    logger.debug('Removed real-time update subscription', {
      metadata: {
        socketId
      }
    });
  }

  private sendCurrentFactors(socket: any, regions: string[]): void {
    const relevantFactors: EmissionFactor[] = [];
    
    for (const [/* factorId */, factor] of this.currentFactors) {
      if (regions.length === 0 || (factor.region && regions.includes(factor.region))) {
        relevantFactors.push(factor);
      }
    }
    
    socket.emit('current_emission_factors', relevantFactors);
  }

  private async refreshAllFactors(): Promise<void> {
    logger.info('Refreshing all emission factors');
    
    await Promise.all([
      this.performScheduledUpdate('electricity_maps'),
      this.performScheduledUpdate('aws_carbon'),
      this.performScheduledUpdate('epa_egrid')
    ]);
  }

  private async performBatchRecalculation(): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting batch recalculation of historical data');
      
      const updates = this.updateQueue.splice(0);
      if (updates.length === 0) {
        logger.info('No updates available for batch recalculation');
        return;
      }
      
      const impactfulUpdates = updates.filter(update => 
        update.impactScope === 'high' || 
        (update.impactScope === 'medium' && Math.abs(update.changePercent) > 10)
      );
      
      if (impactfulUpdates.length > 0) {
        logger.info('Triggering recalculation for impactful changes', {
          metadata: {
            updateCount: impactfulUpdates.length,
            regions: [...new Set(impactfulUpdates.map(u => u.region).filter(Boolean))]
          }
        });
        
        if (this.io) {
          this.io.emit('batch_recalculation_required', {
            updates: impactfulUpdates,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      const duration = Date.now() - startTime;
      logger.info('Batch recalculation completed', {
        metadata: {
          totalUpdates: updates.length,
          impactfulUpdates: impactfulUpdates.length,
          duration: `${duration}ms`
        }
      });
      
    } catch (error: any) {
      logger.error('Batch recalculation failed', {
        error: {
          code: 'BATCH_RECALC_ERROR',
          message: error.message,
          stack: error.stack
        },
        duration: `${Date.now() - startTime}ms`
      });
    }
  }

  public getCurrentFactor(factorId: string): EmissionFactor | null {
    return this.currentFactors.get(factorId) || null;
  }

  public getAllCurrentFactors(): EmissionFactor[] {
    return Array.from(this.currentFactors.values());
  }

  public getMetrics(): RealTimeMetrics {
    return { ...this.metrics };
  }

  public enableUpdates(): void {
    this.isEnabled = true;
    logger.info('Real-time emission factor updates enabled');
  }

  public disableUpdates(): void {
    this.isEnabled = false;
    logger.info('Real-time emission factor updates disabled');
  }

  public async forceUpdate(source?: string): Promise<void> {
    if (source) {
      await this.performScheduledUpdate(source);
    } else {
      await this.refreshAllFactors();
    }
  }

  public getRecentUpdates(hours: number = 24): EmissionFactorUpdate[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    
    return this.updateQueue.filter(update => 
      new Date(update.timestamp).getTime() > cutoffTime
    );
  }
}

export const realTimeUpdatesService = new RealTimeEmissionUpdatesService();
export { RealTimeEmissionUpdatesService };