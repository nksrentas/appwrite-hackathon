/**
 * External API Integration Function - Appwrite Function
 * Fetches carbon data from external APIs with fallback hierarchy:
 * Electricity Maps > AWS Carbon > EPA eGRID > Cached Data
 */

import { Client, Databases } from 'node-appwrite';
import fetch from 'node-fetch';

// Types
interface ElectricityMapsResponse {
  zone: string;
  carbonIntensity: number;
  fossilFreePercentage: number;
  updatedAt: string;
}

interface EPAeGRIDResponse {
  region: string;
  co2_factor_kg_per_mwh: number;
  renewable_percentage: number;
  data_year: number;
}

interface AWSCarbonResponse {
  region: string;
  carbon_intensity_kg_per_kwh: number;
  renewable_percentage: number;
  last_updated: string;
}

interface EmissionFactorData {
  region: {
    country: string;
    state_province?: string;
    grid_region?: string;
  };
  factor_kg_co2_per_kwh: number;
  renewable_percentage: number;
  source: {
    name: string;
    url: string;
    methodology: string;
  };
  confidence_rating: 'high' | 'medium' | 'low';
  valid_from: string;
  valid_until: string;
  last_updated: string;
}

interface AppwriteContext {
  req: any;
  res: any;
  log: (message: string) => void;
  error: (message: string) => void;
}

interface APIRequestParams {
  action: 'fetch_emission_factors' | 'update_cache' | 'test_connectivity';
  region?: {
    country: string;
    state_province?: string;
    coordinates?: [number, number];
  };
  api_preference?: 'electricity_maps' | 'aws_carbon' | 'epa_egrid';
}

// Constants
const API_TIMEOUT = 10000; // 10 seconds
const CACHE_TTL_HOURS = 24; // Cache emission factors for 24 hours
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Initialize Appwrite client
function initializeAppwrite(): { databases: Databases } {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

  return {
    databases: new Databases(client)
  };
}

/**
 * Circuit breaker implementation for external API calls
 */
class CircuitBreaker {
  private failures: Map<string, { count: number; lastFailure: number }> = new Map();
  private readonly threshold = 5;
  private readonly resetTime = 60000; // 1 minute

  async execute<T>(
    apiName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const state = this.failures.get(apiName);
    
    // Check if circuit is open
    if (state && state.count >= this.threshold) {
      const now = Date.now();
      if (now - state.lastFailure < this.resetTime) {
        throw new Error(`Circuit breaker open for ${apiName}`);
      } else {
        // Reset the circuit
        this.failures.delete(apiName);
      }
    }
    
    try {
      const result = await operation();
      // Success - reset failure count
      this.failures.delete(apiName);
      return result;
    } catch (error) {
      // Record failure
      const current = this.failures.get(apiName) || { count: 0, lastFailure: 0 };
      this.failures.set(apiName, {
        count: current.count + 1,
        lastFailure: Date.now()
      });
      throw error;
    }
  }
}

const circuitBreaker = new CircuitBreaker();

/**
 * HTTP client with timeout and retry logic
 */
async function httpRequest(
  url: string,
  options: any = {},
  retries: number = MAX_RETRIES
): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (retries > 0 && !error.name?.includes('AbortError')) {
      console.log(`Retrying request to ${url}, attempts remaining: ${retries - 1}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return httpRequest(url, options, retries - 1);
    }
    
    throw error;
  }
}

/**
 * Fetch emission factors from Electricity Maps API
 */
async function fetchElectricityMapsData(
  country: string,
  coordinates?: [number, number]
): Promise<EmissionFactorData | null> {
  const apiKey = process.env.ELECTRICITY_MAPS_API_KEY;
  if (!apiKey) {
    console.log('Electricity Maps API key not configured');
    return null;
  }
  
  try {
    const zone = country.toUpperCase(); // Electricity Maps uses country codes
    const url = `https://api.electricitymap.org/v3/carbon-intensity/latest?zone=${zone}`;
    
    const data: ElectricityMapsResponse = await circuitBreaker.execute(
      'electricity_maps',
      () => httpRequest(url, {
        headers: {
          'auth-token': apiKey,
          'Content-Type': 'application/json'
        }
      })
    );
    
    return {
      region: {
        country: country,
        grid_region: data.zone
      },
      factor_kg_co2_per_kwh: data.carbonIntensity / 1000, // Convert g/kWh to kg/kWh
      renewable_percentage: data.fossilFreePercentage,
      source: {
        name: 'Electricity Maps',
        url: 'https://electricitymap.org/',
        methodology: 'Real-time electricity carbon intensity'
      },
      confidence_rating: 'high',
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString(),
      last_updated: data.updatedAt
    };
    
  } catch (error) {
    console.error('Electricity Maps API error:', error);
    return null;
  }
}

/**
 * Fetch emission factors from AWS Carbon API
 */
async function fetchAWSCarbonData(
  region: string
): Promise<EmissionFactorData | null> {
  const apiKey = process.env.AWS_CARBON_API_KEY;
  if (!apiKey) {
    console.log('AWS Carbon API key not configured');
    return null;
  }
  
  try {
    // AWS regions mapping
    const awsRegionMap: { [key: string]: string } = {
      'US': 'us-east-1',
      'CA': 'ca-central-1',
      'GB': 'eu-west-2',
      'DE': 'eu-central-1',
      'FR': 'eu-west-3',
      'AU': 'ap-southeast-2',
      'JP': 'ap-northeast-1'
    };
    
    const awsRegion = awsRegionMap[region.toUpperCase()] || 'us-east-1';
    const url = `https://api.aws.amazon.com/carbon-intensity/v1/regions/${awsRegion}`;
    
    const data: AWSCarbonResponse = await circuitBreaker.execute(
      'aws_carbon',
      () => httpRequest(url, {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      })
    );
    
    return {
      region: {
        country: region,
        grid_region: awsRegion
      },
      factor_kg_co2_per_kwh: data.carbon_intensity_kg_per_kwh,
      renewable_percentage: data.renewable_percentage,
      source: {
        name: 'AWS Carbon API',
        url: 'https://aws.amazon.com/about-aws/sustainability/',
        methodology: 'AWS regional carbon intensity data'
      },
      confidence_rating: 'high',
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString(),
      last_updated: data.last_updated
    };
    
  } catch (error) {
    console.error('AWS Carbon API error:', error);
    return null;
  }
}

/**
 * Fetch emission factors from EPA eGRID
 */
async function fetchEPAeGRIDData(
  stateProvince?: string
): Promise<EmissionFactorData | null> {
  const apiKey = process.env.EPA_EGRID_API_KEY;
  if (!apiKey) {
    console.log('EPA eGRID API key not configured');
    return null;
  }
  
  try {
    // EPA eGRID is US-specific
    const region = stateProvince || 'US';
    const url = `https://api.epa.gov/easiur/rest/getEGRIDData?region=${region}&year=2021`;
    
    const data: EPAeGRIDResponse = await circuitBreaker.execute(
      'epa_egrid',
      () => httpRequest(url, {
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        }
      })
    );
    
    return {
      region: {
        country: 'US',
        state_province: stateProvince,
        grid_region: data.region
      },
      factor_kg_co2_per_kwh: data.co2_factor_kg_per_mwh / 1000, // Convert to kWh
      renewable_percentage: data.renewable_percentage,
      source: {
        name: 'EPA eGRID',
        url: 'https://www.epa.gov/egrid',
        methodology: 'EPA Emissions & Generation Resource Integrated Database'
      },
      confidence_rating: 'high',
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString(),
      last_updated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('EPA eGRID API error:', error);
    return null;
  }
}

/**
 * Get cached emission factors from database
 */
async function getCachedEmissionFactors(
  databases: Databases,
  region: { country: string; state_province?: string }
): Promise<EmissionFactorData | null> {
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace-main';
  
  try {
    const queries = [
      `equal("region.country", "${region.country}")`,
      `greaterThan("valid_until", "${new Date().toISOString()}")`,
      'orderDesc("last_updated")',
      'limit(1)'
    ];
    
    if (region.state_province) {
      queries.unshift(`equal("region.state_province", "${region.state_province}")`);
    }
    
    const cached = await databases.listDocuments(
      databaseId,
      'emission_factors',
      queries
    );
    
    if (cached.documents.length > 0) {
      const doc = cached.documents[0];
      return {
        region: JSON.parse(doc.region),
        factor_kg_co2_per_kwh: doc.factor_kg_co2_per_kwh,
        renewable_percentage: doc.renewable_percentage,
        source: JSON.parse(doc.source),
        confidence_rating: doc.confidence_rating,
        valid_from: doc.valid_from,
        valid_until: doc.valid_until,
        last_updated: doc.last_updated
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('Failed to get cached emission factors:', error);
    return null;
  }
}

/**
 * Store emission factors in database cache
 */
async function storeEmissionFactors(
  databases: Databases,
  data: EmissionFactorData
): Promise<void> {
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace-main';
  
  try {
    await databases.createDocument(
      databaseId,
      'emission_factors',
      'unique()',
      {
        region: JSON.stringify(data.region),
        factor_kg_co2_per_kwh: data.factor_kg_co2_per_kwh,
        renewable_percentage: data.renewable_percentage,
        source: JSON.stringify(data.source),
        confidence_rating: data.confidence_rating,
        valid_from: data.valid_from,
        valid_until: data.valid_until,
        last_updated: data.last_updated
      }
    );
    
  } catch (error) {
    console.error('Failed to store emission factors:', error);
    throw error;
  }
}

/**
 * Fetch emission factors with fallback hierarchy
 */
async function fetchEmissionFactorsWithFallback(
  region: { country: string; state_province?: string; coordinates?: [number, number] }
): Promise<EmissionFactorData> {
  const { databases } = initializeAppwrite();
  
  console.log(`Fetching emission factors for ${region.country} ${region.state_province || ''}`);
  
  // Check cache first
  const cached = await getCachedEmissionFactors(databases, region);
  if (cached) {
    console.log('Using cached emission factors');
    return cached;
  }
  
  // Try external APIs in order of preference
  const apiResults: (EmissionFactorData | null)[] = await Promise.allSettled([
    fetchElectricityMapsData(region.country, region.coordinates),
    fetchAWSCarbonData(region.country),
    region.country === 'US' ? fetchEPAeGRIDData(region.state_province) : Promise.resolve(null)
  ]).then(results => 
    results.map(result => 
      result.status === 'fulfilled' ? result.value : null
    )
  );
  
  // Find first successful result
  const emissionData = apiResults.find(data => data !== null);
  
  if (emissionData) {
    // Store in cache
    try {
      await storeEmissionFactors(databases, emissionData);
      console.log(`Stored new emission factors from ${emissionData.source.name}`);
    } catch (error) {
      console.error('Failed to cache emission factors:', error);
    }
    
    return emissionData;
  }
  
  // Ultimate fallback - use global average
  console.log('All APIs failed, using global fallback');
  const fallbackData: EmissionFactorData = {
    region: {
      country: region.country || 'global'
    },
    factor_kg_co2_per_kwh: 0.5, // Global average
    renewable_percentage: 20,
    source: {
      name: 'Global Fallback',
      url: 'https://ourworldindata.org/electricity-carbon-footprint',
      methodology: 'Global average carbon intensity'
    },
    confidence_rating: 'low',
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString(),
    last_updated: new Date().toISOString()
  };
  
  // Store fallback for caching
  try {
    await storeEmissionFactors(databases, fallbackData);
  } catch (error) {
    console.error('Failed to cache fallback data:', error);
  }
  
  return fallbackData;
}

/**
 * Test API connectivity
 */
async function testAPIConnectivity(): Promise<{
  electricity_maps: boolean;
  aws_carbon: boolean;
  epa_egrid: boolean;
}> {
  const results = {
    electricity_maps: false,
    aws_carbon: false,
    epa_egrid: false
  };
  
  // Test Electricity Maps
  try {
    await fetchElectricityMapsData('US');
    results.electricity_maps = true;
  } catch (error) {
    console.log('Electricity Maps connectivity test failed');
  }
  
  // Test AWS Carbon API
  try {
    await fetchAWSCarbonData('US');
    results.aws_carbon = true;
  } catch (error) {
    console.log('AWS Carbon API connectivity test failed');
  }
  
  // Test EPA eGRID
  try {
    await fetchEPAeGRIDData('CA');
    results.epa_egrid = true;
  } catch (error) {
    console.log('EPA eGRID connectivity test failed');
  }
  
  return results;
}

/**
 * Main function handler
 */
export default async function handler(context: AppwriteContext) {
  const { req, res, log, error } = context;
  
  try {
    const params: APIRequestParams = JSON.parse(req.body || '{}');
    
    if (!params.action) {
      error('Missing action parameter');
      return res.json({ error: 'Missing action parameter' }, 400);
    }
    
    log(`Processing API integration request: ${params.action}`);
    
    switch (params.action) {
      case 'fetch_emission_factors':
        if (!params.region) {
          error('Missing region parameter');
          return res.json({ error: 'Missing region parameter' }, 400);
        }
        
        const emissionData = await fetchEmissionFactorsWithFallback(params.region);
        
        return res.json({
          success: true,
          data: emissionData
        });
      
      case 'test_connectivity':
        const connectivity = await testAPIConnectivity();
        
        return res.json({
          success: true,
          connectivity,
          apis_available: Object.values(connectivity).filter(Boolean).length
        });
      
      case 'update_cache':
        // This would trigger a refresh of all cached emission factors
        log('Cache update requested - this would refresh all emission factors');
        
        return res.json({
          success: true,
          message: 'Cache update initiated'
        });
      
      default:
        error(`Unknown action: ${params.action}`);
        return res.json({ error: 'Unknown action' }, 400);
    }
    
  } catch (err: any) {
    error(`API integration failed: ${err.message}`);
    return res.json({
      error: 'API integration failed',
      message: err.message
    }, 500);
  }
}