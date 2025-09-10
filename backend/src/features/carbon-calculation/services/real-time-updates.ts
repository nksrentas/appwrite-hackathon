import { Server as SocketServer } from 'socket.io';
import * as cron from 'node-cron';
import { 
  EmissionFactor, 
  DataSource, 
  EPAGridData, 
  ElectricityMapsData, 
  AWSCarbonData 
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
        socketId: socket.id
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
          socketId: socket.id
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
      electricityMaps: 'Every 15 minutes',\n      awsCarbon: 'Hourly',\n      epaGrid: 'Every 6 hours',\n      batchRecalculation: 'Weekly'\n    });\n  }\n\n  private async loadInitialFactors(): Promise<void> {\n    try {\n      const cachedFactors = await this.cache.get('current_emission_factors');\n      if (cachedFactors) {\n        this.currentFactors = new Map(Object.entries(cachedFactors));\n        logger.info('Loaded cached emission factors', {\n          factorCount: this.currentFactors.size\n        });\n      } else {\n        await this.refreshAllFactors();\n      }\n    } catch (error: any) {\n      logger.error('Failed to load initial emission factors', {\n        error: {\n          code: 'INITIAL_FACTORS_LOAD_ERROR',\n          message: error.message,\n          stack: error.stack\n        }\n      });\n    }\n  }\n\n  private async performScheduledUpdate(source: string): Promise<void> {\n    const startTime = Date.now();\n    \n    try {\n      logger.info(`Performing scheduled update for ${source}`);\n      \n      const updates: EmissionFactorUpdate[] = [];\n      \n      switch (source) {\n        case 'electricity_maps':\n          updates.push(...await this.updateElectricityMapFactors());\n          break;\n        case 'aws_carbon':\n          updates.push(...await this.updateAWSCarbonFactors());\n          break;\n        case 'epa_egrid':\n          updates.push(...await this.updateEPAGridFactors());\n          break;\n      }\n      \n      if (updates.length > 0) {\n        await this.processUpdates(updates);\n        this.metrics.updateCount += updates.length;\n        this.metrics.lastUpdateTime = new Date().toISOString();\n        this.updateDataFreshness(source);\n      }\n      \n      const duration = Date.now() - startTime;\n      logger.info(`Scheduled update completed for ${source}`, {\n        updateCount: updates.length,\n        duration: `${duration}ms`\n      });\n      \n    } catch (error: any) {\n      logger.error(`Scheduled update failed for ${source}`, {\n        error: {\n          code: 'SCHEDULED_UPDATE_ERROR',\n          message: error.message,\n          stack: error.stack\n        },\n        duration: `${Date.now() - startTime}ms`\n      });\n    }\n  }\n\n  private async updateElectricityMapFactors(): Promise<EmissionFactorUpdate[]> {\n    const updates: EmissionFactorUpdate[] = [];\n    const zones = ['US-CA', 'US-TX', 'US-NY', 'GB', 'DE', 'FR', 'JP', 'AU'];\n    \n    for (const zone of zones) {\n      try {\n        const currentData = await externalAPIService.getElectricityMapsData(zone);\n        if (!currentData || currentData.source !== 'real_time') continue;\n        \n        const factorId = `electricity_maps_${zone}`;\n        const currentFactor = this.currentFactors.get(factorId);\n        const newValue = currentData.carbonIntensity / 1000;\n        \n        if (currentFactor && Math.abs(newValue - currentFactor.value) > 0.001) {\n          const change = newValue - currentFactor.value;\n          const changePercent = (change / currentFactor.value) * 100;\n          \n          updates.push({\n            factorId,\n            source: 'Electricity_Maps',\n            oldValue: currentFactor.value,\n            newValue,\n            change,\n            changePercent,\n            timestamp: currentData.timestamp,\n            region: zone,\n            impactScope: this.getImpactScope(Math.abs(changePercent))\n          });\n          \n          this.currentFactors.set(factorId, {\n            ...currentFactor,\n            value: newValue,\n            lastUpdated: currentData.timestamp\n          });\n        } else if (!currentFactor) {\n          this.currentFactors.set(factorId, {\n            id: factorId,\n            name: `Electricity Maps - ${zone}`,\n            value: newValue,\n            unit: 'kg_CO2_per_kWh',\n            source: 'Electricity_Maps',\n            region: zone,\n            lastUpdated: currentData.timestamp,\n            validFrom: currentData.timestamp\n          });\n        }\n      } catch (error: any) {\n        logger.warn(`Failed to update electricity maps factor for ${zone}`, {\n          error: error.message\n        });\n      }\n    }\n    \n    return updates;\n  }\n\n  private async updateAWSCarbonFactors(): Promise<EmissionFactorUpdate[]> {\n    const updates: EmissionFactorUpdate[] = [];\n    const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];\n    \n    for (const region of regions) {\n      try {\n        const currentData = await externalAPIService.getAWSCarbonData(region, 'ec2');\n        if (!currentData) continue;\n        \n        const factorId = `aws_carbon_${region}`;\n        const currentFactor = this.currentFactors.get(factorId);\n        const newValue = currentData.carbonIntensity / 1000;\n        \n        if (currentFactor && Math.abs(newValue - currentFactor.value) > 0.01) {\n          const change = newValue - currentFactor.value;\n          const changePercent = (change / currentFactor.value) * 100;\n          \n          updates.push({\n            factorId,\n            source: 'AWS_Carbon',\n            oldValue: currentFactor.value,\n            newValue,\n            change,\n            changePercent,\n            timestamp: currentData.timestamp,\n            region,\n            impactScope: this.getImpactScope(Math.abs(changePercent))\n          });\n          \n          this.currentFactors.set(factorId, {\n            ...currentFactor,\n            value: newValue,\n            lastUpdated: currentData.timestamp\n          });\n        } else if (!currentFactor) {\n          this.currentFactors.set(factorId, {\n            id: factorId,\n            name: `AWS Carbon - ${region}`,\n            value: newValue,\n            unit: 'kg_CO2_per_kWh',\n            source: 'AWS_Carbon',\n            region,\n            lastUpdated: currentData.timestamp,\n            validFrom: currentData.timestamp\n          });\n        }\n      } catch (error: any) {\n        logger.warn(`Failed to update AWS carbon factor for ${region}`, {\n          error: error.message\n        });\n      }\n    }\n    \n    return updates;\n  }\n\n  private async updateEPAGridFactors(): Promise<EmissionFactorUpdate[]> {\n    const updates: EmissionFactorUpdate[] = [];\n    \n    try {\n      const integrity = await epaGridService.validateDataIntegrity();\n      if (!integrity.isValid) {\n        logger.warn('EPA eGRID data integrity issues detected', {\n          errors: integrity.errors\n        });\n        return updates;\n      }\n      \n      const subregions = epaGridService.getAvailableSubregions();\n      \n      for (const subregion of subregions) {\n        const currentData = await epaGridService.getEmissionFactorByRegion(subregion);\n        if (!currentData) continue;\n        \n        const factorId = `epa_grid_${subregion}`;\n        const currentFactor = this.currentFactors.get(factorId);\n        const newValue = currentData.emissionRate / 1000;\n        \n        if (currentFactor && Math.abs(newValue - currentFactor.value) > 0.005) {\n          const change = newValue - currentFactor.value;\n          const changePercent = (change / currentFactor.value) * 100;\n          \n          updates.push({\n            factorId,\n            source: 'EPA_eGRID',\n            oldValue: currentFactor.value,\n            newValue,\n            change,\n            changePercent,\n            timestamp: currentData.lastUpdated,\n            region: subregion,\n            impactScope: this.getImpactScope(Math.abs(changePercent))\n          });\n          \n          this.currentFactors.set(factorId, {\n            ...currentFactor,\n            value: newValue,\n            lastUpdated: currentData.lastUpdated\n          });\n        } else if (!currentFactor) {\n          this.currentFactors.set(factorId, {\n            id: factorId,\n            name: `EPA eGRID - ${subregion}`,\n            value: newValue,\n            unit: 'kg_CO2_per_kWh',\n            source: 'EPA_eGRID',\n            region: subregion,\n            lastUpdated: currentData.lastUpdated,\n            validFrom: currentData.lastUpdated\n          });\n        }\n      }\n    } catch (error: any) {\n      logger.error('Failed to update EPA eGRID factors', {\n        error: error.message\n      });\n    }\n    \n    return updates;\n  }\n\n  private async processUpdates(updates: EmissionFactorUpdate[]): Promise<void> {\n    this.updateQueue.push(...updates);\n    \n    await this.cache.set('current_emission_factors', \n      Object.fromEntries(this.currentFactors), \n      { ttl: 24 * 60 * 60 * 1000 }\n    );\n    \n    this.broadcastUpdates(updates);\n    \n    const avgChange = updates.reduce((sum, update) => sum + Math.abs(update.changePercent), 0) / updates.length;\n    this.metrics.averageChangePercent = avgChange;\n  }\n\n  private broadcastUpdates(updates: EmissionFactorUpdate[]): void {\n    if (!this.io) return;\n    \n    for (const [socketId, subscription] of this.subscriptions) {\n      const relevantUpdates = updates.filter(update => \n        this.isUpdateRelevant(update, subscription)\n      );\n      \n      if (relevantUpdates.length > 0) {\n        this.io.to(socketId).emit('emission_factor_updates', relevantUpdates);\n        \n        relevantUpdates.forEach(update => {\n          if (subscription.callback) {\n            subscription.callback(update);\n          }\n        });\n      }\n    }\n  }\n\n  private isUpdateRelevant(update: EmissionFactorUpdate, subscription: UpdateSubscription): boolean {\n    if (subscription.sources.length > 0 && !subscription.sources.includes(update.source)) {\n      return false;\n    }\n    \n    if (subscription.regions.length > 0 && update.region && !subscription.regions.includes(update.region)) {\n      return false;\n    }\n    \n    if (Math.abs(update.changePercent) < subscription.minChangeThreshold) {\n      return false;\n    }\n    \n    return true;\n  }\n\n  private getImpactScope(changePercent: number): 'low' | 'medium' | 'high' {\n    if (changePercent >= 20) return 'high';\n    if (changePercent >= 5) return 'medium';\n    return 'low';\n  }\n\n  private updateDataFreshness(source: string): void {\n    this.metrics.dataFreshness[source] = Date.now();\n  }\n\n  public addSubscription(socketId: string, subscription: UpdateSubscription): void {\n    this.subscriptions.set(socketId, subscription);\n    this.metrics.activeSubscriptions = this.subscriptions.size;\n    \n    logger.debug('Added real-time update subscription', {\n      socketId,\n      regions: subscription.regions,\n      sources: subscription.sources,\n      minChangeThreshold: subscription.minChangeThreshold\n    });\n  }\n\n  public removeSubscription(socketId: string): void {\n    this.subscriptions.delete(socketId);\n    this.metrics.activeSubscriptions = this.subscriptions.size;\n    \n    logger.debug('Removed real-time update subscription', {\n      socketId\n    });\n  }\n\n  private sendCurrentFactors(socket: any, regions: string[]): void {\n    const relevantFactors: EmissionFactor[] = [];\n    \n    for (const [factorId, factor] of this.currentFactors) {\n      if (regions.length === 0 || (factor.region && regions.includes(factor.region))) {\n        relevantFactors.push(factor);\n      }\n    }\n    \n    socket.emit('current_emission_factors', relevantFactors);\n  }\n\n  private async refreshAllFactors(): Promise<void> {\n    logger.info('Refreshing all emission factors');\n    \n    await Promise.all([\n      this.performScheduledUpdate('electricity_maps'),\n      this.performScheduledUpdate('aws_carbon'),\n      this.performScheduledUpdate('epa_egrid')\n    ]);\n  }\n\n  private async performBatchRecalculation(): Promise<void> {\n    const startTime = Date.now();\n    \n    try {\n      logger.info('Starting batch recalculation of historical data');\n      \n      const updates = this.updateQueue.splice(0);\n      if (updates.length === 0) {\n        logger.info('No updates available for batch recalculation');\n        return;\n      }\n      \n      const impactfulUpdates = updates.filter(update => \n        update.impactScope === 'high' || \n        (update.impactScope === 'medium' && Math.abs(update.changePercent) > 10)\n      );\n      \n      if (impactfulUpdates.length > 0) {\n        logger.info('Triggering recalculation for impactful changes', {\n          updateCount: impactfulUpdates.length,\n          regions: [...new Set(impactfulUpdates.map(u => u.region).filter(Boolean))]\n        });\n        \n        if (this.io) {\n          this.io.emit('batch_recalculation_required', {\n            updates: impactfulUpdates,\n            timestamp: new Date().toISOString()\n          });\n        }\n      }\n      \n      const duration = Date.now() - startTime;\n      logger.info('Batch recalculation completed', {\n        totalUpdates: updates.length,\n        impactfulUpdates: impactfulUpdates.length,\n        duration: `${duration}ms`\n      });\n      \n    } catch (error: any) {\n      logger.error('Batch recalculation failed', {\n        error: {\n          code: 'BATCH_RECALC_ERROR',\n          message: error.message,\n          stack: error.stack\n        },\n        duration: `${Date.now() - startTime}ms`\n      });\n    }\n  }\n\n  public getCurrentFactor(factorId: string): EmissionFactor | null {\n    return this.currentFactors.get(factorId) || null;\n  }\n\n  public getAllCurrentFactors(): EmissionFactor[] {\n    return Array.from(this.currentFactors.values());\n  }\n\n  public getMetrics(): RealTimeMetrics {\n    return { ...this.metrics };\n  }\n\n  public enableUpdates(): void {\n    this.isEnabled = true;\n    logger.info('Real-time emission factor updates enabled');\n  }\n\n  public disableUpdates(): void {\n    this.isEnabled = false;\n    logger.info('Real-time emission factor updates disabled');\n  }\n\n  public async forceUpdate(source?: string): Promise<void> {\n    if (source) {\n      await this.performScheduledUpdate(source);\n    } else {\n      await this.refreshAllFactors();\n    }\n  }\n\n  public getRecentUpdates(hours: number = 24): EmissionFactorUpdate[] {\n    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);\n    \n    return this.updateQueue.filter(update => \n      new Date(update.timestamp).getTime() > cutoffTime\n    );\n  }\n}\n\nexport const realTimeUpdatesService = new RealTimeEmissionUpdatesService();\nexport { RealTimeEmissionUpdatesService };