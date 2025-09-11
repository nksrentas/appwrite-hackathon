import { parse } from 'csv-parse';
import axios from 'axios';
import * as cron from 'node-cron';
import { logger } from '@shared/utils/logger';
import { CacheService } from '@shared/utils/cache';

interface PostalCodeMapping {
  postalCode: string;
  normalizedCode: string;
  country: string;
  region: string;
  state?: string;
  province?: string;
  eGridSubregion?: string;
  electricityZone: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  timezone?: string;
  lastUpdated: string;
}

interface GeographicBoundary {
  id: string;
  name: string;
  type: 'country' | 'state' | 'province' | 'region' | 'subregion';
  parentId?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  emissionZone: string;
}

interface MappingStatistics {
  totalMappings: number;
  countriesSupported: number;
  lastUpdate: string;
  coveragePercentage: number;
  dataQuality: {
    complete: number;
    partial: number;
    missing: number;
  };
}

class GeographicMappingService {
  private cache: CacheService;
  private postalMappings: Map<string, PostalCodeMapping> = new Map();
  private boundaries: Map<string, GeographicBoundary> = new Map();
  private countryMappings: Map<string, string[]> = new Map();
  private statistics: MappingStatistics;

  constructor() {
    this.cache = new CacheService();
    this.statistics = {
      totalMappings: 0,
      countriesSupported: 0,
      lastUpdate: new Date().toISOString(),
      coveragePercentage: 0,
      dataQuality: {
        complete: 0,
        partial: 0,
        missing: 0
      }
    };

    this.initializeDataSources();
    this.initializeUpdateScheduler();
  }

  private async initializeDataSources(): Promise<void> {
    try {
      const cachedMappings = await this.cache.get('geographic_mappings');
      if (cachedMappings && this.isCacheValid(cachedMappings)) {
        this.loadFromCache(cachedMappings);
        logger.info('Geographic mappings loaded from cache', {
          metadata: {
            totalMappings: this.postalMappings.size,
            countries: this.countryMappings.size
          }
        });
      } else {
        await this.loadAllMappings();
      }
    } catch (error: any) {
      logger.error('Failed to initialize geographic mappings', {
        error: error.message
      });
      this.loadFallbackMappings();
    }
  }

  private isCacheValid(cachedData: any): boolean {
    if (!cachedData || !cachedData.lastUpdate) return false;
    
    const cacheAge = Date.now() - new Date(cachedData.lastUpdate).getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 1 week
    
    return cacheAge < maxAge;
  }

  private loadFromCache(cachedData: any): void {
    this.postalMappings = new Map(Object.entries(cachedData.postalMappings || {}));
    this.boundaries = new Map(Object.entries(cachedData.boundaries || {}));
    this.countryMappings = new Map(Object.entries(cachedData.countryMappings || {}));
    this.statistics = cachedData.statistics || this.statistics;
  }

  private async loadAllMappings(): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('Loading geographic mappings from external sources');
      
      await Promise.all([
        this.loadUSPostalMappings(),
        this.loadInternationalMappings(),
        this.loadEGridSubregions(),
        this.loadElectricityZones()
      ]);
      
      await this.generateStatistics();
      await this.cacheAllMappings();
      
      const duration = Date.now() - startTime;
      logger.info('Geographic mappings loaded successfully', {
        metadata: {
          totalMappings: this.postalMappings.size,
          countries: this.countryMappings.size,
          duration: `${duration}ms`
        }
      });
      
    } catch (error: any) {
      logger.error('Failed to load geographic mappings', {
        error: error.message
      });
      this.loadFallbackMappings();
    }
  }

  private async loadUSPostalMappings(): Promise<void> {
    try {
      const zipToGridUrl = 'https://www.epa.gov/sites/default/files/2023-01/power-profiler-zipcode-tool-2022.csv';
      
      const response = await axios.get(zipToGridUrl, {
        responseType: 'stream',
        timeout: 30000,
        headers: {
          'User-Agent': 'EcoTrace-Geographic-Mapper/1.0'
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
              const zipCode = row['ZIP'].toString().padStart(5, '0');
              const mapping: PostalCodeMapping = {
                postalCode: zipCode,
                normalizedCode: this.normalizePostalCode(zipCode, 'US'),
                country: 'US',
                region: row['State abbreviation'] || '',
                state: row['State abbreviation'] || '',
                eGridSubregion: row['eGRID subregion acronym'],
                electricityZone: `US-${row['State abbreviation'] || 'US'}`,
                lastUpdated: new Date().toISOString()
              };
              
              mappings.push(mapping);
            }
          })
          .on('end', () => {
            mappings.forEach(mapping => {
              this.postalMappings.set(mapping.normalizedCode, mapping);
            });
            
            this.updateCountryMappings('US', mappings.map(m => m.normalizedCode));
            
            logger.info('US postal mappings loaded', {
              metadata: {
                zipCodeCount: mappings.length
              }
            });
            resolve();
          })
          .on('error', reject);
      });
      
    } catch (error: any) {
      logger.warn('Failed to load US postal mappings from EPA, using fallback', {
        error: error.message
      });
      this.loadUSFallbackMappings();
    }
  }

  private async loadInternationalMappings(): Promise<void> {
    const countries = [
      { code: 'CA', name: 'Canada', zones: ['CA-AB', 'CA-BC', 'CA-MB', 'CA-NB', 'CA-NL', 'CA-NS', 'CA-NT', 'CA-NU', 'CA-ON', 'CA-PE', 'CA-QC', 'CA-SK', 'CA-YT'] },
      { code: 'GB', name: 'United Kingdom', zones: ['GB'] },
      { code: 'DE', name: 'Germany', zones: ['DE'] },
      { code: 'FR', name: 'France', zones: ['FR'] },
      { code: 'JP', name: 'Japan', zones: ['JP'] },
      { code: 'AU', name: 'Australia', zones: ['AU-NSW', 'AU-QLD', 'AU-SA', 'AU-TAS', 'AU-VIC', 'AU-WA'] },
      { code: 'CN', name: 'China', zones: ['CN'] },
      { code: 'IN', name: 'India', zones: ['IN'] },
      { code: 'BR', name: 'Brazil', zones: ['BR-S', 'BR-NE', 'BR-N', 'BR-CS'] }
    ];

    for (const country of countries) {
      await this.loadCountryPostalMappings(country.code, country.name, country.zones);
    }
  }

  private async loadCountryPostalMappings(countryCode: string, countryName: string, zones: string[]): Promise<void> {
    const postalRanges = this.getPostalRangesForCountry(countryCode);
    const mappings: PostalCodeMapping[] = [];
    
    postalRanges.forEach(range => {
      const zone = zones.find(z => z.includes(range.region)) || zones[0];
      
      for (let i = range.start; i <= range.end; i += range.increment) {
        const postalCode = this.formatPostalCode(i, countryCode);
        const normalizedCode = this.normalizePostalCode(postalCode, countryCode);
        
        const mapping: PostalCodeMapping = {
          postalCode,
          normalizedCode,
          country: countryCode,
          region: range.region,
          electricityZone: zone,
          coordinates: range.coordinates ? {
            latitude: range.coordinates.lat + (Math.random() - 0.5) * 2,
            longitude: range.coordinates.lng + (Math.random() - 0.5) * 2
          } : undefined,
          timezone: range.timezone,
          lastUpdated: new Date().toISOString()
        };
        
        mappings.push(mapping);
      }
    });
    
    mappings.forEach(mapping => {
      this.postalMappings.set(mapping.normalizedCode, mapping);
    });
    
    this.updateCountryMappings(countryCode, mappings.map(m => m.normalizedCode));
    
    logger.debug(`Loaded postal mappings for ${countryName}`, {
      metadata: {
        mappingCount: mappings.length
      }
    });
  }

  private getPostalRangesForCountry(countryCode: string): Array<{
    start: number;
    end: number;
    increment: number;
    region: string;
    coordinates?: { lat: number; lng: number };
    timezone?: string;
  }> {
    const ranges: Record<string, Array<any>> = {
      'CA': [
        { start: 10000, end: 19999, increment: 1000, region: 'ON', coordinates: { lat: 43.65, lng: -79.38 }, timezone: 'America/Toronto' },
        { start: 20000, end: 29999, increment: 1000, region: 'QC', coordinates: { lat: 45.50, lng: -73.57 }, timezone: 'America/Montreal' },
        { start: 30000, end: 39999, increment: 1000, region: 'QC', coordinates: { lat: 46.81, lng: -71.21 }, timezone: 'America/Montreal' },
        { start: 80000, end: 89999, increment: 1000, region: 'AB', coordinates: { lat: 51.05, lng: -114.07 }, timezone: 'America/Edmonton' },
        { start: 90000, end: 99999, increment: 1000, region: 'BC', coordinates: { lat: 49.28, lng: -123.12 }, timezone: 'America/Vancouver' }
      ],
      'GB': [
        { start: 10000, end: 99999, increment: 5000, region: 'EN', coordinates: { lat: 51.51, lng: -0.13 }, timezone: 'Europe/London' }
      ],
      'DE': [
        { start: 10000, end: 99999, increment: 5000, region: 'DE', coordinates: { lat: 52.52, lng: 13.40 }, timezone: 'Europe/Berlin' }
      ],
      'FR': [
        { start: 10000, end: 99999, increment: 5000, region: 'FR', coordinates: { lat: 48.86, lng: 2.35 }, timezone: 'Europe/Paris' }
      ],
      'JP': [
        { start: 1000000, end: 9999999, increment: 50000, region: 'JP', coordinates: { lat: 35.68, lng: 139.69 }, timezone: 'Asia/Tokyo' }
      ],
      'AU': [
        { start: 1000, end: 2999, increment: 100, region: 'NSW', coordinates: { lat: -33.87, lng: 151.21 }, timezone: 'Australia/Sydney' },
        { start: 3000, end: 3999, increment: 100, region: 'VIC', coordinates: { lat: -37.81, lng: 144.96 }, timezone: 'Australia/Melbourne' },
        { start: 4000, end: 4999, increment: 100, region: 'QLD', coordinates: { lat: -27.47, lng: 153.03 }, timezone: 'Australia/Brisbane' },
        { start: 5000, end: 5999, increment: 100, region: 'SA', coordinates: { lat: -34.93, lng: 138.60 }, timezone: 'Australia/Adelaide' },
        { start: 6000, end: 6999, increment: 100, region: 'WA', coordinates: { lat: -31.95, lng: 115.86 }, timezone: 'Australia/Perth' },
        { start: 7000, end: 7999, increment: 100, region: 'TAS', coordinates: { lat: -42.88, lng: 147.33 }, timezone: 'Australia/Hobart' }
      ],
      'CN': [
        { start: 100000, end: 999999, increment: 50000, region: 'CN', coordinates: { lat: 39.90, lng: 116.40 }, timezone: 'Asia/Shanghai' }
      ],
      'IN': [
        { start: 100000, end: 999999, increment: 50000, region: 'IN', coordinates: { lat: 28.61, lng: 77.21 }, timezone: 'Asia/Kolkata' }
      ],
      'BR': [
        { start: 10000, end: 99999, increment: 5000, region: 'BR', coordinates: { lat: -23.55, lng: -46.64 }, timezone: 'America/Sao_Paulo' }
      ]
    };
    
    return ranges[countryCode] || [];
  }

  private formatPostalCode(code: number, countryCode: string): string {
    switch (countryCode) {
      case 'US':
        return code.toString().padStart(5, '0');
      case 'CA':
        const str = code.toString().padStart(6, '0');
        return `${str.slice(0, 3)} ${str.slice(3)}`;
      case 'GB':
        return `${String.fromCharCode(65 + Math.floor(code / 10000))}${(code % 10000).toString().padStart(4, '0')}`;
      case 'JP':
        const jpStr = code.toString().padStart(7, '0');
        return `${jpStr.slice(0, 3)}-${jpStr.slice(3)}`;
      case 'AU':
        return code.toString().padStart(4, '0');
      default:
        return code.toString().padStart(5, '0');
    }
  }

  private normalizePostalCode(postalCode: string, countryCode: string): string {
    let normalized = postalCode.replace(/\\s+/g, '').replace(/-/g, '').toUpperCase();
    
    switch (countryCode) {
      case 'US':
        return normalized.substring(0, 5);
      case 'CA':
        return normalized.substring(0, 6);
      case 'GB':
        return normalized.substring(0, 6);
      case 'DE':
      case 'FR':
        return normalized.substring(0, 5);
      case 'JP':
        return normalized.substring(0, 7);
      case 'AU':
        return normalized.substring(0, 4);
      default:
        return normalized.substring(0, 8);
    }
  }

  private async loadEGridSubregions(): Promise<void> {
    const eGridSubregions = [
      { id: 'CAMX', name: 'California ISO', bounds: { north: 42.0, south: 32.5, east: -114.1, west: -124.4 } },
      { id: 'ERCT', name: 'ERCOT Texas', bounds: { north: 36.5, south: 25.8, east: -93.5, west: -106.6 } },
      { id: 'NYCW', name: 'NYISO Zone A-E', bounds: { north: 45.0, south: 40.5, east: -71.9, west: -79.8 } },
      { id: 'NYUP', name: 'NYISO Zone F-K', bounds: { north: 45.0, south: 42.0, east: -73.3, west: -79.8 } },
      { id: 'NEWE', name: 'ISO New England', bounds: { north: 47.5, south: 40.9, east: -66.9, west: -73.7 } },
      { id: 'RFCE', name: 'RFC East', bounds: { north: 42.5, south: 36.5, east: -75.0, west: -83.0 } },
      { id: 'SRSO', name: 'SERC South', bounds: { north: 36.6, south: 24.5, east: -75.4, west: -91.7 } },
      { id: 'FRCC', name: 'FRCC All', bounds: { north: 31.0, south: 24.4, east: -79.9, west: -87.6 } }
    ];
    
    eGridSubregions.forEach(subregion => {
      const boundary: GeographicBoundary = {
        id: subregion.id,
        name: subregion.name,
        type: 'subregion',
        coordinates: {
          latitude: (subregion.bounds.north + subregion.bounds.south) / 2,
          longitude: (subregion.bounds.east + subregion.bounds.west) / 2
        },
        bounds: subregion.bounds,
        emissionZone: subregion.id
      };
      
      this.boundaries.set(subregion.id, boundary);
    });
  }

  private async loadElectricityZones(): Promise<void> {
    const electricityZones = [
      { id: 'US-CA', name: 'California', country: 'US', coordinates: { lat: 36.7783, lng: -119.4179 } },
      { id: 'US-TX', name: 'Texas', country: 'US', coordinates: { lat: 31.9686, lng: -99.9018 } },
      { id: 'US-NY', name: 'New York', country: 'US', coordinates: { lat: 42.1657, lng: -74.9481 } },
      { id: 'GB', name: 'Great Britain', country: 'GB', coordinates: { lat: 55.3781, lng: -3.4360 } },
      { id: 'DE', name: 'Germany', country: 'DE', coordinates: { lat: 51.1657, lng: 10.4515 } },
      { id: 'FR', name: 'France', country: 'FR', coordinates: { lat: 46.2276, lng: 2.2137 } },
      { id: 'JP', name: 'Japan', country: 'JP', coordinates: { lat: 36.2048, lng: 138.2529 } },
      { id: 'AU', name: 'Australia', country: 'AU', coordinates: { lat: -25.2744, lng: 133.7751 } },
      { id: 'CN', name: 'China', country: 'CN', coordinates: { lat: 35.8617, lng: 104.1954 } },
      { id: 'IN', name: 'India', country: 'IN', coordinates: { lat: 20.5937, lng: 78.9629 } }
    ];
    
    electricityZones.forEach(zone => {
      const boundary: GeographicBoundary = {
        id: zone.id,
        name: zone.name,
        type: 'region',
        coordinates: {
          latitude: zone.coordinates.lat,
          longitude: zone.coordinates.lng
        },
        bounds: {
          north: zone.coordinates.lat + 5,
          south: zone.coordinates.lat - 5,
          east: zone.coordinates.lng + 5,
          west: zone.coordinates.lng - 5
        },
        emissionZone: zone.id
      };
      
      this.boundaries.set(zone.id, boundary);
    });
  }

  private loadUSFallbackMappings(): void {
    const usStates = [
      { code: 'CA', region: 'CAMX', zips: ['90000-96199'] },
      { code: 'TX', region: 'ERCT', zips: ['75000-79999', '73000-73999', '88000-88999'] },
      { code: 'NY', region: 'NYCW', zips: ['10000-14999'] },
      { code: 'FL', region: 'FRCC', zips: ['32000-34999'] },
      { code: 'IL', region: 'SRMW', zips: ['60000-62999'] },
      { code: 'PA', region: 'RFCE', zips: ['15000-19699'] },
      { code: 'OH', region: 'RFCW', zips: ['43000-45999'] },
      { code: 'WA', region: 'NWPP', zips: ['98000-99499'] },
      { code: 'OR', region: 'NWPP', zips: ['97000-97999'] }
    ];
    
    usStates.forEach(state => {
      state.zips.forEach(range => {
        const [start, end] = range.split('-').map(z => parseInt(z));
        for (let zip = start; zip <= end; zip += 100) {
          const zipCode = zip.toString().padStart(5, '0');
          const normalizedCode = this.normalizePostalCode(zipCode, 'US');
          
          const mapping: PostalCodeMapping = {
            postalCode: zipCode,
            normalizedCode,
            country: 'US',
            region: state.code,
            state: state.code,
            eGridSubregion: state.region,
            electricityZone: `US-${state.code}`,
            lastUpdated: new Date().toISOString()
          };
          
          this.postalMappings.set(normalizedCode, mapping);
        }
      });
    });
    
    this.updateCountryMappings('US', Array.from(this.postalMappings.keys()).filter(k => 
      this.postalMappings.get(k)?.country === 'US'
    ));
  }

  private loadFallbackMappings(): void {
    logger.info('Loading fallback geographic mappings');
    
    this.loadUSFallbackMappings();
    
    const fallbackCountries = [
      { code: 'CA', zone: 'CA' },
      { code: 'GB', zone: 'GB' },
      { code: 'DE', zone: 'DE' },
      { code: 'FR', zone: 'FR' },
      { code: 'JP', zone: 'JP' },
      { code: 'AU', zone: 'AU' },
      { code: 'CN', zone: 'CN' },
      { code: 'IN', zone: 'IN' }
    ];
    
    fallbackCountries.forEach(country => {
      const mapping: PostalCodeMapping = {
        postalCode: '00000',
        normalizedCode: '00000',
        country: country.code,
        region: country.code,
        electricityZone: country.zone,
        lastUpdated: new Date().toISOString()
      };
      
      this.postalMappings.set(`${country.code}_00000`, mapping);
      this.updateCountryMappings(country.code, [`${country.code}_00000`]);
    });
  }

  private updateCountryMappings(countryCode: string, postalCodes: string[]): void {
    const existing = this.countryMappings.get(countryCode) || [];
    this.countryMappings.set(countryCode, [...existing, ...postalCodes]);
  }

  private async generateStatistics(): Promise<void> {
    const totalMappings = this.postalMappings.size;
    const countries = this.countryMappings.size;
    
    let complete = 0;
    let partial = 0;
    let missing = 0;
    
    this.postalMappings.forEach(mapping => {
      const hasCoordinates = !!mapping.coordinates;
      const hasTimezone = !!mapping.timezone;
      const hasRegion = !!mapping.region;
      
      const completeness = [hasCoordinates, hasTimezone, hasRegion].filter(Boolean).length;
      
      if (completeness === 3) complete++;
      else if (completeness >= 1) partial++;
      else missing++;
    });
    
    this.statistics = {
      totalMappings,
      countriesSupported: countries,
      lastUpdate: new Date().toISOString(),
      coveragePercentage: Math.round((totalMappings / 1000000) * 100),
      dataQuality: {
        complete,
        partial,
        missing
      }
    };
  }

  private async cacheAllMappings(): Promise<void> {
    const cacheData = {
      postalMappings: Object.fromEntries(this.postalMappings),
      boundaries: Object.fromEntries(this.boundaries),
      countryMappings: Object.fromEntries(this.countryMappings),
      statistics: this.statistics,
      lastUpdate: new Date().toISOString()
    };
    
    await this.cache.set('geographic_mappings', cacheData, 
      { ttl: 7 * 24 * 60 * 60 * 1000 }
    );
  }

  private initializeUpdateScheduler(): void {
    cron.schedule('0 2 * * 0', async () => {
      logger.info('Starting weekly geographic mapping update');
      await this.loadAllMappings();
    });
    
    logger.info('Geographic mapping update scheduler initialized');
  }

  public getPostalCodeMapping(postalCode: string, countryCode?: string): PostalCodeMapping | null {
    if (!postalCode) return null;
    
    const normalizedCode = countryCode ? 
      this.normalizePostalCode(postalCode, countryCode) : 
      postalCode.replace(/\\s+/g, '').replace(/-/g, '').toUpperCase();
    
    let mapping = this.postalMappings.get(normalizedCode);
    
    if (!mapping && countryCode) {
      mapping = this.postalMappings.get(`${countryCode}_${normalizedCode}`);
    }
    
    if (!mapping) {
      mapping = this.findNearestMapping(normalizedCode, countryCode);
    }
    
    return mapping || null;
  }

  private findNearestMapping(postalCode: string, countryCode?: string): PostalCodeMapping | undefined {
    if (!countryCode) return undefined;
    
    const countryMappings = this.countryMappings.get(countryCode);
    if (!countryMappings || countryMappings.length === 0) return undefined;
    
    let nearestMapping: PostalCodeMapping | undefined = undefined;
    let smallestDistance = Infinity;
    
    for (const mappingKey of countryMappings) {
      const mapping = this.postalMappings.get(mappingKey);
      if (!mapping) continue;
      
      const distance = this.calculatePostalDistance(postalCode, mapping.normalizedCode);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        nearestMapping = mapping;
      }
    }
    
    if (nearestMapping && smallestDistance <= 1000) {
      logger.debug('Using nearest postal code mapping', {
        metadata: {
          requested: postalCode,
          nearest: nearestMapping.postalCode,
          distance: smallestDistance,
          country: countryCode
        }
      });
      return nearestMapping;
    }
    
    return undefined;
  }

  private calculatePostalDistance(postal1: string, postal2: string): number {
    const num1 = parseInt(postal1.replace(/[^0-9]/g, '')) || 0;
    const num2 = parseInt(postal2.replace(/[^0-9]/g, '')) || 0;
    return Math.abs(num1 - num2);
  }

  public getElectricityZone(postalCode: string, countryCode?: string): string | null {
    const mapping = this.getPostalCodeMapping(postalCode, countryCode);
    return mapping?.electricityZone || null;
  }

  public getEGridSubregion(postalCode: string): string | null {
    const mapping = this.getPostalCodeMapping(postalCode, 'US');
    return mapping?.eGridSubregion || null;
  }

  public getSupportedCountries(): string[] {
    return Array.from(this.countryMappings.keys());
  }

  public getCountryStatistics(countryCode: string): {
    mappingCount: number;
    regions: string[];
    zones: string[];
  } {
    const countryMappings = this.countryMappings.get(countryCode) || [];
    const mappings = countryMappings
      .map(key => this.postalMappings.get(key))
      .filter(Boolean) as PostalCodeMapping[];
    
    const regions = [...new Set(mappings.map(m => m.region).filter(Boolean))];
    const zones = [...new Set(mappings.map(m => m.electricityZone).filter(Boolean))];
    
    return {
      mappingCount: mappings.length,
      regions,
      zones
    };
  }

  public getStatistics(): MappingStatistics {
    return { ...this.statistics };
  }

  public async validateGeographicBoundaries(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (this.postalMappings.size === 0) {
      errors.push('No postal code mappings available');
    }
    
    if (this.boundaries.size === 0) {
      warnings.push('No geographic boundaries defined');
    }
    
    const countriesWithoutMappings = ['US', 'CA', 'GB', 'DE', 'FR'].filter(
      country => !this.countryMappings.has(country)
    );
    
    if (countriesWithoutMappings.length > 0) {
      warnings.push(`Missing mappings for countries: ${countriesWithoutMappings.join(', ')}`);
    }
    
    const dataAge = Date.now() - new Date(this.statistics.lastUpdate).getTime();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    if (dataAge > maxAge) {
      warnings.push(`Geographic data is ${Math.floor(dataAge / (24 * 60 * 60 * 1000))} days old`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  public async refreshMappings(): Promise<void> {
    logger.info('Manually refreshing geographic mappings');
    await this.loadAllMappings();
  }
}

export const geographicMappingService = new GeographicMappingService();
export { GeographicMappingService };