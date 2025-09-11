import axios from 'axios';
import * as cron from 'node-cron';
import { parse } from 'csv-parse';
// import * as fs from 'fs';
// import * as path from 'path';
import { EPAGridData, DataSource } from '@features/carbon-calculation/types';
import { logger } from '@shared/utils/logger';
import { CacheService } from '@shared/utils/cache';

interface EPAGridResponse {
  results: {
    egrid_subrgn_acronym: string;
    egrid_subrgn_name: string;
    state_abbreviation: string;
    egrid_subrgn_co2_rate_lb_mwh: number;
    data_year: number;
    quarter: string;
  }[];
}

interface EPASubregionData {
  subregion: string;
  name: string;
  state: string;
  co2Rate: number;
  year: number;
  quarter: number;
}

// interface ZipCodeData {
//   zip: string;
//   state: string;
//   county: string;
//   subregion: string;
// }

interface PostalCodeMapping {
  postalCode: string;
  subregion: string;
  state: string;
}

class EPAGridService {
  private dataSource: DataSource;
  private postalCodeMappings: Map<string, PostalCodeMapping> = new Map();
  private emissionFactors: Map<string, EPAGridData> = new Map();
  private cache: CacheService;

  constructor() {
    this.cache = new CacheService();

    this.dataSource = {
      name: 'EPA eGRID',
      type: 'EPA_eGRID',
      lastUpdated: new Date().toISOString(),
      freshness: 'quarterly',
      reliability: 0.95,
      coverage: {
        geographic: ['US'],
        temporal: 'Current year with quarterly updates',
        activities: ['electricity']
      }
    };

    this.initializeScheduler();
    this.loadInitialData();
  }

  private initializeScheduler(): void {
    cron.schedule('0 0 1 */3 *', async () => {
      try {
        logger.info('EPA eGRID scheduled update starting');
        await this.updateGridData();
        logger.info('EPA eGRID scheduled update completed');
      } catch (error: any) {
        logger.error('EPA eGRID scheduled update failed', {
          error: {
            code: 'EGRID_SCHEDULED_UPDATE_ERROR',
            message: error.message,
            stack: error.stack
          }
        });
      }
    });

    logger.info('EPA eGRID scheduler initialized for quarterly updates');
  }

  private async loadInitialData(): Promise<void> {
    try {
      const cachedData = await this.cache.get('complete_dataset') as {
        postalCodes: PostalCodeMapping[];
        emissionFactors: EPAGridData[];
      } | null;

      if (cachedData && this.isCacheValid(cachedData)) {
        this.loadFromCache(cachedData);
        logger.info('EPA eGRID data loaded from cache', {
          metadata: { 
            postalCodeCount: this.postalCodeMappings.size,
            emissionFactorCount: this.emissionFactors.size 
          }
        });
      } else {
        await this.updateGridData();
      }
    } catch (error: any) {
      logger.error('EPA eGRID initial data load failed', {
        error: {
          code: 'EGRID_INITIAL_LOAD_ERROR',
          message: error.message,
          stack: error.stack
        }
      });
      
      this.loadFallbackData();
    }
  }

  private isCacheValid(cachedData: any): boolean {
    if (!cachedData || !cachedData.postalCodes || !cachedData.emissionFactors) {
      return false;
    }

    const cacheAge = Date.now() - new Date(this.dataSource.lastUpdated).getTime();
    const maxCacheAge = 7 * 24 * 60 * 60 * 1000;
    
    return cacheAge < maxCacheAge;
  }

  private loadFromCache(data: {
    postalCodes: PostalCodeMapping[];
    emissionFactors: EPAGridData[];
  }): void {
    this.postalCodeMappings.clear();
    this.emissionFactors.clear();

    data.postalCodes.forEach(mapping => {
      this.postalCodeMappings.set(mapping.postalCode, mapping);
    });

    data.emissionFactors.forEach(factor => {
      this.emissionFactors.set(factor.subregion, factor);
    });
  }

  private loadFallbackData(): void {
    const fallbackEmissionFactors: EPAGridData[] = [
      {
        subregion: 'CAMX',
        state: 'CA',
        postalCodes: ['90000-99999'],
        emissionRate: 244.73,
        unit: 'kg_CO2_per_MWh',
        year: 2022,
        quarter: 4,
        lastUpdated: new Date().toISOString(),
        source: 'EPA_eGRID_2022'
      },
      {
        subregion: 'NYCW',
        state: 'NY',
        postalCodes: ['10000-14999'],
        emissionRate: 285.45,
        unit: 'kg_CO2_per_MWh',
        year: 2022,
        quarter: 4,
        lastUpdated: new Date().toISOString(),
        source: 'EPA_eGRID_2022'
      },
      {
        subregion: 'ERCT',
        state: 'TX',
        postalCodes: ['75000-79999'],
        emissionRate: 407.89,
        unit: 'kg_CO2_per_MWh',
        year: 2022,
        quarter: 4,
        lastUpdated: new Date().toISOString(),
        source: 'EPA_eGRID_2022'
      }
    ];

    fallbackEmissionFactors.forEach(factor => {
      this.emissionFactors.set(factor.subregion, factor);
      
      factor.postalCodes.forEach(range => {
        if (range.includes('-')) {
          const [start, end] = range.split('-');
          const startCode = parseInt(start);
          const endCode = parseInt(end);
          
          for (let i = startCode; i <= endCode; i += 1000) {
            const postalCode = i.toString().padStart(5, '0');
            this.postalCodeMappings.set(postalCode.substring(0, 3), {
              postalCode,
              subregion: factor.subregion,
              state: factor.state
            });
          }
        }
      });
    });

    logger.info('EPA eGRID fallback data loaded', {
      metadata: { 
        subregions: fallbackEmissionFactors.length,
        postalCodeMappings: this.postalCodeMappings.size 
      }
    });
  }

  public async updateGridData(): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('EPA eGRID data update starting');

      const [gridData, postalMappings] = await Promise.all([
        this.fetchGridEmissionFactors(),
        this.fetchPostalCodeMappings()
      ]);

      this.processGridData(gridData);
      this.processPostalMappings(postalMappings);

      await this.cache.set('complete_dataset', {
        postalCodes: Array.from(this.postalCodeMappings.values()),
        emissionFactors: Array.from(this.emissionFactors.values())
      });

      this.dataSource.lastUpdated = new Date().toISOString();

      const duration = Date.now() - startTime;
      logger.info('EPA eGRID data update completed', {
        metadata: { 
          duration: `${duration}ms`,
          subregions: this.emissionFactors.size,
          postalCodeMappings: this.postalCodeMappings.size 
        }
      });

    } catch (error: any) {
      logger.error('EPA eGRID data update failed', {
        error: {
          code: 'EGRID_UPDATE_ERROR',
          message: error.message,
          stack: error.stack
        },
        duration: `${Date.now() - startTime}ms`
      });
      throw error;
    }
  }

  private async fetchGridEmissionFactors(): Promise<EPASubregionData[]> {
    const apiKey = process.env.EPA_EGRID_API_KEY;
    const apiUrl = 'https://api.epa.gov/egrid/power-profiler/v1.0/subregions';
    
    try {
      if (apiKey) {
        const response = await axios.get<EPAGridResponse>(apiUrl, {
          timeout: 30000,
          headers: {
            'X-API-KEY': apiKey,
            'User-Agent': 'EcoTrace-Carbon-Calculator/1.0',
            'Accept': 'application/json'
          }
        });

        if (response.data?.results) {
          return response.data.results.map(entry => ({
            subregion: entry.egrid_subrgn_acronym,
            name: entry.egrid_subrgn_name,
            state: entry.state_abbreviation,
            co2Rate: entry.egrid_subrgn_co2_rate_lb_mwh,
            year: entry.data_year,
            quarter: parseInt(entry.quarter) || 4
          }));
        }
      }
    } catch (error: any) {
      logger.warn('EPA eGRID API unavailable, downloading latest data file', {
        error: error.message
      });
    }

    return this.downloadAndParseEGridData();
  }

  private async downloadAndParseEGridData(): Promise<EPASubregionData[]> {
    // const _dataUrl = 'https://www.epa.gov/sites/default/files/2023-01/egrid2021_summary_tables.xlsx';
    const csvUrl = 'https://www.epa.gov/sites/default/files/2023-01/egrid2021_data.csv';
    
    try {
      const response = await axios.get(csvUrl, {
        responseType: 'stream',
        timeout: 60000,
        headers: {
          'User-Agent': 'EcoTrace-Carbon-Calculator/1.0'
        }
      });

      const results: EPASubregionData[] = [];
      
      return new Promise((resolve, reject) => {
        response.data
          .pipe(parse({ 
            columns: true,
            skip_empty_lines: true,
            trim: true
          }))
          .on('data', (row: any) => {
            if (row['eGRID subregion acronym'] && row['eGRID subregion CO2 equivalent total output emission rate (lb/MWh)']) {
              results.push({
                subregion: row['eGRID subregion acronym'],
                name: row['eGRID subregion name'] || '',
                state: row['State abbreviation'] || '',
                co2Rate: parseFloat(row['eGRID subregion CO2 equivalent total output emission rate (lb/MWh)']),
                year: parseInt(row['Data year']) || 2021,
                quarter: 4
              });
            }
          })
          .on('end', () => {
            logger.info('EPA eGRID CSV data parsed successfully', {
              metadata: { recordCount: results.length }
            });
            resolve(results);
          })
          .on('error', (error: any) => {
            logger.error('EPA eGRID CSV parsing failed', { error });
            reject(error);
          });
      });
    } catch (error: any) {
      logger.error('EPA eGRID data download failed', { error: error.message });
      throw new Error('Unable to fetch EPA eGRID data');
    }
  }

  private async fetchPostalCodeMappings(): Promise<PostalCodeMapping[]> {
    try {
      const zipCodeMappingUrl = 'https://www.epa.gov/sites/default/files/2023-01/zip_code_tool.csv';
      
      const response = await axios.get(zipCodeMappingUrl, {
        responseType: 'stream',
        timeout: 60000,
        headers: {
          'User-Agent': 'EcoTrace-Carbon-Calculator/1.0'
        }
      });

      const mappings: PostalCodeMapping[] = [];
      
      return new Promise((resolve, reject) => {
        response.data
          .pipe(parse({ 
            columns: true,
            skip_empty_lines: true,
            trim: true
          }))
          .on('data', (row: any) => {
            if (row['ZIP'] && row['eGRID subregion acronym']) {
              const zipCode = row['ZIP'].substring(0, 3);
              mappings.push({
                postalCode: zipCode,
                subregion: row['eGRID subregion acronym'],
                state: row['State abbreviation'] || ''
              });
            }
          })
          .on('end', () => {
            logger.info('EPA eGRID ZIP code mappings parsed successfully', {
              metadata: { mappingCount: mappings.length }
            });
            resolve(mappings);
          })
          .on('error', (error: any) => {
            logger.error('EPA eGRID ZIP code mapping parsing failed', { error });
            reject(error);
          });
      });
    } catch (error: any) {
      logger.warn('EPA eGRID ZIP code mapping download failed, using fallback', {
        error: error.message
      });
      
      return this.getFallbackPostalMappings();
    }
  }

  private getFallbackPostalMappings(): PostalCodeMapping[] {
    return [
      { postalCode: '900', subregion: 'CAMX', state: 'CA' },
      { postalCode: '901', subregion: 'CAMX', state: 'CA' },
      { postalCode: '902', subregion: 'CAMX', state: 'CA' },
      { postalCode: '903', subregion: 'CAMX', state: 'CA' },
      { postalCode: '904', subregion: 'CAMX', state: 'CA' },
      { postalCode: '905', subregion: 'CAMX', state: 'CA' },
      { postalCode: '906', subregion: 'CAMX', state: 'CA' },
      { postalCode: '907', subregion: 'CAMX', state: 'CA' },
      { postalCode: '908', subregion: 'CAMX', state: 'CA' },
      { postalCode: '910', subregion: 'CAMX', state: 'CA' },
      { postalCode: '911', subregion: 'CAMX', state: 'CA' },
      { postalCode: '912', subregion: 'CAMX', state: 'CA' },
      { postalCode: '913', subregion: 'CAMX', state: 'CA' },
      { postalCode: '914', subregion: 'CAMX', state: 'CA' },
      { postalCode: '915', subregion: 'CAMX', state: 'CA' },
      { postalCode: '916', subregion: 'CAMX', state: 'CA' },
      { postalCode: '917', subregion: 'CAMX', state: 'CA' },
      { postalCode: '918', subregion: 'CAMX', state: 'CA' },
      { postalCode: '919', subregion: 'CAMX', state: 'CA' },
      { postalCode: '920', subregion: 'CAMX', state: 'CA' },
      { postalCode: '921', subregion: 'CAMX', state: 'CA' },
      { postalCode: '922', subregion: 'CAMX', state: 'CA' },
      { postalCode: '923', subregion: 'CAMX', state: 'CA' },
      { postalCode: '924', subregion: 'CAMX', state: 'CA' },
      { postalCode: '925', subregion: 'CAMX', state: 'CA' },
      { postalCode: '926', subregion: 'CAMX', state: 'CA' },
      { postalCode: '927', subregion: 'CAMX', state: 'CA' },
      { postalCode: '928', subregion: 'CAMX', state: 'CA' },
      { postalCode: '930', subregion: 'CAMX', state: 'CA' },
      { postalCode: '931', subregion: 'CAMX', state: 'CA' },
      { postalCode: '932', subregion: 'CAMX', state: 'CA' },
      { postalCode: '933', subregion: 'CAMX', state: 'CA' },
      { postalCode: '934', subregion: 'CAMX', state: 'CA' },
      { postalCode: '935', subregion: 'CAMX', state: 'CA' },
      { postalCode: '936', subregion: 'CAMX', state: 'CA' },
      { postalCode: '937', subregion: 'CAMX', state: 'CA' },
      { postalCode: '938', subregion: 'CAMX', state: 'CA' },
      { postalCode: '939', subregion: 'CAMX', state: 'CA' },
      { postalCode: '940', subregion: 'CAMX', state: 'CA' },
      { postalCode: '941', subregion: 'CAMX', state: 'CA' },
      { postalCode: '942', subregion: 'CAMX', state: 'CA' },
      { postalCode: '943', subregion: 'CAMX', state: 'CA' },
      { postalCode: '944', subregion: 'CAMX', state: 'CA' },
      { postalCode: '945', subregion: 'CAMX', state: 'CA' },
      { postalCode: '946', subregion: 'CAMX', state: 'CA' },
      { postalCode: '947', subregion: 'CAMX', state: 'CA' },
      { postalCode: '948', subregion: 'CAMX', state: 'CA' },
      { postalCode: '949', subregion: 'CAMX', state: 'CA' },
      { postalCode: '950', subregion: 'CAMX', state: 'CA' },
      { postalCode: '951', subregion: 'CAMX', state: 'CA' },
      { postalCode: '952', subregion: 'CAMX', state: 'CA' },
      { postalCode: '953', subregion: 'CAMX', state: 'CA' },
      { postalCode: '954', subregion: 'CAMX', state: 'CA' },
      { postalCode: '955', subregion: 'CAMX', state: 'CA' },
      { postalCode: '956', subregion: 'CAMX', state: 'CA' },
      { postalCode: '957', subregion: 'CAMX', state: 'CA' },
      { postalCode: '958', subregion: 'CAMX', state: 'CA' },
      { postalCode: '959', subregion: 'CAMX', state: 'CA' },
      { postalCode: '960', subregion: 'CAMX', state: 'CA' },
      { postalCode: '961', subregion: 'CAMX', state: 'CA' },
      
      { postalCode: '100', subregion: 'NYCW', state: 'NY' },
      { postalCode: '101', subregion: 'NYCW', state: 'NY' },
      { postalCode: '102', subregion: 'NYCW', state: 'NY' },
      { postalCode: '103', subregion: 'NYCW', state: 'NY' },
      { postalCode: '104', subregion: 'NYCW', state: 'NY' },
      { postalCode: '105', subregion: 'NYCW', state: 'NY' },
      { postalCode: '106', subregion: 'NYCW', state: 'NY' },
      { postalCode: '107', subregion: 'NYCW', state: 'NY' },
      { postalCode: '108', subregion: 'NYCW', state: 'NY' },
      { postalCode: '109', subregion: 'NYCW', state: 'NY' },
      { postalCode: '110', subregion: 'NYCW', state: 'NY' },
      { postalCode: '111', subregion: 'NYCW', state: 'NY' },
      { postalCode: '112', subregion: 'NYCW', state: 'NY' },
      { postalCode: '113', subregion: 'NYCW', state: 'NY' },
      { postalCode: '114', subregion: 'NYCW', state: 'NY' },
      { postalCode: '115', subregion: 'NYCW', state: 'NY' },
      { postalCode: '116', subregion: 'NYCW', state: 'NY' },
      { postalCode: '117', subregion: 'NYCW', state: 'NY' },
      { postalCode: '118', subregion: 'NYCW', state: 'NY' },
      { postalCode: '119', subregion: 'NYCW', state: 'NY' },
      
      { postalCode: '750', subregion: 'ERCT', state: 'TX' },
      { postalCode: '751', subregion: 'ERCT', state: 'TX' },
      { postalCode: '752', subregion: 'ERCT', state: 'TX' },
      { postalCode: '753', subregion: 'ERCT', state: 'TX' },
      { postalCode: '754', subregion: 'ERCT', state: 'TX' },
      { postalCode: '755', subregion: 'ERCT', state: 'TX' },
      { postalCode: '756', subregion: 'ERCT', state: 'TX' },
      { postalCode: '757', subregion: 'ERCT', state: 'TX' },
      { postalCode: '758', subregion: 'ERCT', state: 'TX' },
      { postalCode: '759', subregion: 'ERCT', state: 'TX' },
      { postalCode: '760', subregion: 'ERCT', state: 'TX' },
      { postalCode: '761', subregion: 'ERCT', state: 'TX' },
      { postalCode: '762', subregion: 'ERCT', state: 'TX' },
      { postalCode: '763', subregion: 'ERCT', state: 'TX' },
      { postalCode: '764', subregion: 'ERCT', state: 'TX' },
      { postalCode: '765', subregion: 'ERCT', state: 'TX' },
      { postalCode: '766', subregion: 'ERCT', state: 'TX' },
      { postalCode: '767', subregion: 'ERCT', state: 'TX' },
      { postalCode: '768', subregion: 'ERCT', state: 'TX' },
      { postalCode: '770', subregion: 'ERCT', state: 'TX' },
      { postalCode: '771', subregion: 'ERCT', state: 'TX' },
      { postalCode: '772', subregion: 'ERCT', state: 'TX' },
      { postalCode: '773', subregion: 'ERCT', state: 'TX' },
      { postalCode: '774', subregion: 'ERCT', state: 'TX' },
      { postalCode: '775', subregion: 'ERCT', state: 'TX' },
      { postalCode: '776', subregion: 'ERCT', state: 'TX' },
      { postalCode: '777', subregion: 'ERCT', state: 'TX' },
      { postalCode: '778', subregion: 'ERCT', state: 'TX' },
      { postalCode: '779', subregion: 'ERCT', state: 'TX' },
      { postalCode: '780', subregion: 'ERCT', state: 'TX' },
      { postalCode: '781', subregion: 'ERCT', state: 'TX' },
      { postalCode: '782', subregion: 'ERCT', state: 'TX' },
      { postalCode: '783', subregion: 'ERCT', state: 'TX' },
      { postalCode: '784', subregion: 'ERCT', state: 'TX' },
      { postalCode: '785', subregion: 'ERCT', state: 'TX' },
      { postalCode: '786', subregion: 'ERCT', state: 'TX' },
      { postalCode: '787', subregion: 'ERCT', state: 'TX' },
      { postalCode: '788', subregion: 'ERCT', state: 'TX' },
      { postalCode: '789', subregion: 'ERCT', state: 'TX' },
      { postalCode: '790', subregion: 'ERCT', state: 'TX' },
      { postalCode: '791', subregion: 'ERCT', state: 'TX' },
      { postalCode: '792', subregion: 'ERCT', state: 'TX' },
      { postalCode: '793', subregion: 'ERCT', state: 'TX' },
      { postalCode: '794', subregion: 'ERCT', state: 'TX' },
      { postalCode: '795', subregion: 'ERCT', state: 'TX' },
      { postalCode: '796', subregion: 'ERCT', state: 'TX' },
      { postalCode: '797', subregion: 'ERCT', state: 'TX' },
      { postalCode: '798', subregion: 'ERCT', state: 'TX' },
      { postalCode: '799', subregion: 'ERCT', state: 'TX' }
    ];
  }

  private processGridData(gridData: EPASubregionData[]): void {
    this.emissionFactors.clear();

    gridData.forEach(entry => {
      const emissionFactor: EPAGridData = {
        subregion: entry.subregion,
        state: entry.state,
        postalCodes: [],
        emissionRate: entry.co2Rate * 0.453592,
        unit: 'kg_CO2_per_MWh',
        year: entry.year,
        quarter: entry.quarter,
        lastUpdated: new Date().toISOString(),
        source: `EPA_eGRID_${entry.year}`
      };

      this.emissionFactors.set(entry.subregion, emissionFactor);
    });

    logger.info('EPA eGRID emission factors processed', {
      metadata: { 
        factorCount: this.emissionFactors.size,
        subregions: Array.from(this.emissionFactors.keys()) 
      }
    });
  }

  private processPostalMappings(mappings: PostalCodeMapping[]): void {
    this.postalCodeMappings.clear();

    mappings.forEach(mapping => {
      this.postalCodeMappings.set(mapping.postalCode, mapping);
    });
  }

  public async getEmissionFactorByPostalCode(postalCode: string): Promise<EPAGridData | null> {
    const prefix = postalCode.substring(0, 3);
    let mapping = this.postalCodeMappings.get(prefix);
    
    if (!mapping) {
      mapping = this.findNearestMapping(prefix);
      if (!mapping) {
        logger.warn('EPA eGRID postal code mapping not found', {
          metadata: { 
            postalCode: prefix,
            availableMappings: this.postalCodeMappings.size 
          }
        });
        return null;
      }
    }

    const emissionFactor = this.emissionFactors.get(mapping.subregion);
    
    if (!emissionFactor) {
      logger.warn('EPA eGRID emission factor not found', {
        metadata: { 
          subregion: mapping.subregion,
          postalCode: prefix 
        }
      });
      return null;
    }

    const enrichedFactor = { ...emissionFactor };
    enrichedFactor.postalCodes = this.getPostalCodesForSubregion(mapping.subregion);
    
    return enrichedFactor;
  }

  private findNearestMapping(postalCode: string): PostalCodeMapping | undefined {
    const targetCode = parseInt(postalCode);
    let nearestMapping: PostalCodeMapping | undefined = undefined;
    let smallestDistance = Infinity;

    for (const [code, mapping] of Array.from(this.postalCodeMappings.entries())) {
      const distance = Math.abs(parseInt(code) - targetCode);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        nearestMapping = mapping;
      }
    }

    if (nearestMapping && smallestDistance <= 100) {
      logger.info('Using nearest postal code mapping', {
        metadata: {
          requestedCode: postalCode,
          nearestCode: nearestMapping.postalCode,
          distance: smallestDistance,
          subregion: nearestMapping.subregion
        }
      });
      return nearestMapping;
    }

    return undefined;
  }

  private getPostalCodesForSubregion(subregion: string): string[] {
    const codes: string[] = [];
    for (const [code, mapping] of Array.from(this.postalCodeMappings.entries())) {
      if (mapping.subregion === subregion) {
        codes.push(code);
      }
    }
    return codes.slice(0, 10);
  }

  public async getEmissionFactorByRegion(subregion: string): Promise<EPAGridData | null> {
    return this.emissionFactors.get(subregion) || null;
  }

  public getAvailableSubregions(): string[] {
    return Array.from(this.emissionFactors.keys());
  }

  public getDataSource(): DataSource {
    return { ...this.dataSource };
  }

  public async validateDataIntegrity(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    statistics: {
      subregions: number;
      postalCodeMappings: number;
      averageEmissionRate: number;
      dataAge: number;
      coverageGaps: string[];
      dataQuality: number;
    };
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const coverageGaps: string[] = [];

    if (this.emissionFactors.size === 0) {
      errors.push('No emission factors available');
    }

    if (this.postalCodeMappings.size === 0) {
      errors.push('No postal code mappings available');
    }

    const now = Date.now();
    const dataAge = now - new Date(this.dataSource.lastUpdated).getTime();
    const maxAgeMs = 120 * 24 * 60 * 60 * 1000;

    if (dataAge > maxAgeMs) {
      warnings.push(`Data is ${Math.floor(dataAge / (24 * 60 * 60 * 1000))} days old`);
    }

    const expectedSubregions = ['CAMX', 'NYCW', 'ERCT', 'NYUP', 'NEWE', 'RFCE', 'SRSO', 'FRCC', 'SERC', 'RFCM', 'RFCW', 'SRMW', 'SRMV', 'SRCE', 'SPNO', 'SPSO', 'MROW', 'MROE', 'NWPP', 'RMPA', 'AZNM', 'HIMS', 'AKGD', 'AKMS'];
    
    expectedSubregions.forEach(subregion => {
      if (!this.emissionFactors.has(subregion)) {
        coverageGaps.push(subregion);
      }
    });

    if (coverageGaps.length > 0) {
      warnings.push(`Missing data for subregions: ${coverageGaps.join(', ')}`);
    }

    let dataQuality = 1.0;
    if (coverageGaps.length > 0) {
      dataQuality -= (coverageGaps.length / expectedSubregions.length) * 0.3;
    }
    
    if (dataAge > maxAgeMs) {
      dataQuality -= 0.2;
    }

    const emissionRates = Array.from(this.emissionFactors.values()).map(f => f.emissionRate);
    const averageEmissionRate = emissionRates.length > 0 ? 
      emissionRates.reduce((a, b) => a + b, 0) / emissionRates.length : 0;

    const outliers = emissionRates.filter(rate => 
      Math.abs(rate - averageEmissionRate) > averageEmissionRate * 2
    );
    if (outliers.length > emissionRates.length * 0.1) {
      warnings.push(`${outliers.length} emission rates appear to be outliers`);
      dataQuality -= 0.1;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      statistics: {
        subregions: this.emissionFactors.size,
        postalCodeMappings: this.postalCodeMappings.size,
        averageEmissionRate: Math.round(averageEmissionRate * 100) / 100,
        dataAge: Math.floor(dataAge / (24 * 60 * 60 * 1000)),
        coverageGaps,
        dataQuality: Math.round(dataQuality * 100) / 100
      }
    };
  }
}

export const epaGridService = new EPAGridService();

export { EPAGridService };