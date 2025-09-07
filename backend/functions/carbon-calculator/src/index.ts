/**
 * Carbon Calculation Engine - Appwrite Function
 * Core calculation logic for converting development activities to carbon emissions
 * Fetches emission factors, calculates energy consumption, and stores results
 */

import { Client, Databases, Functions } from 'node-appwrite';

// Types
interface CarbonCalculationInput {
  activity_id: string;
  user_id: string;
  activity_type: 'commit' | 'pr' | 'ci_run' | 'deployment' | 'local_dev';
  commit_data?: {
    sha: string;
    message: string;
    additions: number;
    deletions: number;
    changed_files: number;
  };
  pr_data?: {
    number: number;
    title: string;
    additions: number;
    deletions: number;
    changed_files: number;
    action: string;
  };
  ci_data?: {
    provider: string;
    duration_seconds: number;
    success: boolean;
    runner_type: string;
    workflow_name?: string;
    run_id?: number;
  };
  repository?: {
    name: string;
    full_name: string;
    private: boolean;
  };
  user_location?: {
    country: string;
    region?: string;
    coordinates?: [number, number];
  };
}

interface EmissionFactor {
  factor_kg_co2_per_kwh: number;
  renewable_percentage: number;
  source: {
    name: string;
    url: string;
    methodology: string;
  };
  confidence_rating: 'high' | 'medium' | 'low';
  region: string;
  last_updated: string;
}

interface EnergyBreakdown {
  compute_kwh: number;
  network_kwh: number;
  storage_kwh: number;
  cooling_kwh: number;
  total_kwh: number;
}

interface CarbonCalculationResult {
  carbon_kg: number;
  confidence: 'high' | 'medium' | 'low';
  energy_breakdown: EnergyBreakdown;
  emission_factors: EmissionFactor;
  methodology_version: string;
  confidence_factors: {
    data_quality: number;
    methodology_certainty: number;
    temporal_accuracy: number;
  };
}

interface AppwriteContext {
  req: any;
  res: any;
  log: (message: string) => void;
  error: (message: string) => void;
}

// Constants
const METHODOLOGY_VERSION = '1.0.0';
const DEFAULT_EMISSION_FACTOR = 0.5; // kg CO2 per kWh (global average)
const CACHE_TTL_HOURS = 6;

// Carbon calculation coefficients (based on research and industry standards)
const CARBON_COEFFICIENTS = {
  // Base energy consumption per line of code (kWh)
  CODE_LINE_ENERGY: 0.00001, // 0.01 Wh per line
  
  // CI/CD runner energy consumption (kWh per minute)
  CI_RUNNERS: {
    standard: 0.0167, // 1 kWh per hour
    large: 0.0333,    // 2 kWh per hour
    xlarge: 0.0667,   // 4 kWh per hour
  },
  
  // Network transfer energy (kWh per MB)
  NETWORK_TRANSFER: 0.00001, // 0.01 Wh per MB
  
  // Storage operations energy (kWh per operation)
  STORAGE_READ: 0.000001,   // 0.001 Wh per read
  STORAGE_WRITE: 0.000002,  // 0.002 Wh per write
  
  // Developer workstation energy during coding (kWh per minute)
  LOCAL_DEVELOPMENT: 0.0083, // 0.5 kWh per hour average
  
  // Data center PUE (Power Usage Effectiveness)
  PUE_FACTOR: 1.4,
  
  // Cooling overhead multiplier
  COOLING_MULTIPLIER: 0.4
};

// Initialize Appwrite client
function initializeAppwrite(): { databases: Databases; functions: Functions } {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

  return {
    databases: new Databases(client),
    functions: new Functions(client)
  };
}

/**
 * Get emission factors for user's location with fallback hierarchy
 */
async function getEmissionFactor(
  databases: Databases,
  userLocation?: { country: string; region?: string }
): Promise<EmissionFactor> {
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace-main';
  
  try {
    if (userLocation) {
      // Try to find specific regional factors
      const queries = [
        `equal("region.country", "${userLocation.country}")`,
        `greaterThan("valid_until", "${new Date().toISOString()}")`,
        `orderDesc("last_updated")`
      ];
      
      if (userLocation.region) {
        queries.unshift(`equal("region.state_province", "${userLocation.region}")`);
      }
      
      const factors = await databases.listDocuments(
        databaseId,
        'emission_factors',
        queries.slice(0, 3) // Limit query complexity
      );
      
      if (factors.documents.length > 0) {
        const factor = factors.documents[0];
        return {
          factor_kg_co2_per_kwh: factor.factor_kg_co2_per_kwh,
          renewable_percentage: factor.renewable_percentage,
          source: JSON.parse(factor.source),
          confidence_rating: factor.confidence_rating,
          region: JSON.parse(factor.region),
          last_updated: factor.last_updated
        };
      }
    }
    
    // Fallback to global average
    return {
      factor_kg_co2_per_kwh: DEFAULT_EMISSION_FACTOR,
      renewable_percentage: 20, // Global renewable average
      source: {
        name: 'Global Average',
        url: 'https://ourworldindata.org/electricity-carbon-footprint',
        methodology: 'IEA global electricity carbon intensity'
      },
      confidence_rating: 'low',
      region: 'global',
      last_updated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Failed to fetch emission factors:', error);
    
    // Emergency fallback
    return {
      factor_kg_co2_per_kwh: DEFAULT_EMISSION_FACTOR,
      renewable_percentage: 20,
      source: {
        name: 'Fallback',
        url: '',
        methodology: 'Emergency fallback value'
      },
      confidence_rating: 'low',
      region: 'unknown',
      last_updated: new Date().toISOString()
    };
  }
}

/**
 * Calculate energy consumption for commit activity
 */
function calculateCommitEnergy(commitData: CarbonCalculationInput['commit_data']): EnergyBreakdown {
  if (!commitData) {
    return { compute_kwh: 0, network_kwh: 0, storage_kwh: 0, cooling_kwh: 0, total_kwh: 0 };
  }
  
  // Compute energy based on lines changed
  const totalLines = commitData.additions + commitData.deletions;
  const computeEnergy = totalLines * CARBON_COEFFICIENTS.CODE_LINE_ENERGY;
  
  // Network energy for git operations (estimate 1KB per line changed)
  const estimatedDataSizeKB = totalLines * 1;
  const networkEnergy = (estimatedDataSizeKB / 1024) * CARBON_COEFFICIENTS.NETWORK_TRANSFER;
  
  // Storage operations (reads for existing files, writes for changes)
  const storageEnergy = 
    (commitData.changed_files * CARBON_COEFFICIENTS.STORAGE_READ) +
    (totalLines * CARBON_COEFFICIENTS.STORAGE_WRITE);
  
  // Developer workstation time (estimate based on commit complexity)
  const estimatedDevelopmentMinutes = Math.max(5, Math.min(120, totalLines / 10));
  const developmentEnergy = estimatedDevelopmentMinutes * CARBON_COEFFICIENTS.LOCAL_DEVELOPMENT;
  
  const baseEnergy = computeEnergy + networkEnergy + storageEnergy + developmentEnergy;
  const coolingEnergy = baseEnergy * CARBON_COEFFICIENTS.COOLING_MULTIPLIER;
  const totalEnergy = baseEnergy * CARBON_COEFFICIENTS.PUE_FACTOR;
  
  return {
    compute_kwh: computeEnergy + developmentEnergy,
    network_kwh: networkEnergy,
    storage_kwh: storageEnergy,
    cooling_kwh: coolingEnergy,
    total_kwh: totalEnergy
  };
}

/**
 * Calculate energy consumption for CI/CD activity
 */
function calculateCiEnergy(ciData: CarbonCalculationInput['ci_data']): EnergyBreakdown {
  if (!ciData) {
    return { compute_kwh: 0, network_kwh: 0, storage_kwh: 0, cooling_kwh: 0, total_kwh: 0 };
  }
  
  // Get runner energy consumption rate
  const runnerType = ciData.runner_type as keyof typeof CARBON_COEFFICIENTS.CI_RUNNERS;
  const runnerEnergyRate = CARBON_COEFFICIENTS.CI_RUNNERS[runnerType] || CARBON_COEFFICIENTS.CI_RUNNERS.standard;
  
  // Calculate compute energy based on runtime
  const runtimeMinutes = ciData.duration_seconds / 60;
  const computeEnergy = runtimeMinutes * runnerEnergyRate;
  
  // Network energy for artifact downloads/uploads (estimated)
  const estimatedNetworkMB = Math.max(10, runtimeMinutes * 2); // 2MB per minute average
  const networkEnergy = estimatedNetworkMB * CARBON_COEFFICIENTS.NETWORK_TRANSFER;
  
  // Storage operations for logs, artifacts, cache
  const estimatedStorageOps = runtimeMinutes * 10; // 10 operations per minute
  const storageEnergy = estimatedStorageOps * CARBON_COEFFICIENTS.STORAGE_WRITE;
  
  const baseEnergy = computeEnergy + networkEnergy + storageEnergy;
  const coolingEnergy = baseEnergy * CARBON_COEFFICIENTS.COOLING_MULTIPLIER;
  const totalEnergy = baseEnergy * CARBON_COEFFICIENTS.PUE_FACTOR;
  
  return {
    compute_kwh: computeEnergy,
    network_kwh: networkEnergy,
    storage_kwh: storageEnergy,
    cooling_kwh: coolingEnergy,
    total_kwh: totalEnergy
  };
}

/**
 * Calculate energy consumption for pull request activity
 */
function calculatePrEnergy(prData: CarbonCalculationInput['pr_data']): EnergyBreakdown {
  if (!prData) {
    return { compute_kwh: 0, network_kwh: 0, storage_kwh: 0, cooling_kwh: 0, total_kwh: 0 };
  }
  
  // Similar to commit but with additional review overhead
  const totalLines = prData.additions + prData.deletions;
  
  // Base calculation similar to commit
  const baseCommitEnergy = calculateCommitEnergy({
    sha: `pr-${prData.number}`,
    message: prData.title,
    additions: prData.additions,
    deletions: prData.deletions,
    changed_files: prData.changed_files
  });
  
  // Additional energy for PR review processes
  const reviewOverhead = baseCommitEnergy.total_kwh * 0.3; // 30% overhead for reviews
  
  return {
    compute_kwh: baseCommitEnergy.compute_kwh + (reviewOverhead * 0.5),
    network_kwh: baseCommitEnergy.network_kwh + (reviewOverhead * 0.3),
    storage_kwh: baseCommitEnergy.storage_kwh + (reviewOverhead * 0.1),
    cooling_kwh: baseCommitEnergy.cooling_kwh + (reviewOverhead * 0.1),
    total_kwh: baseCommitEnergy.total_kwh + reviewOverhead
  };
}

/**
 * Calculate confidence factors based on data quality and methodology certainty
 */
function calculateConfidenceFactors(
  activityType: string,
  emissionFactorConfidence: string,
  hasLocationData: boolean
): { data_quality: number; methodology_certainty: number; temporal_accuracy: number } {
  // Data quality based on activity type and available information
  let dataQuality = 0.5; // Base score
  
  switch (activityType) {
    case 'ci_run':
      dataQuality = 0.9; // CI runs have precise duration data
      break;
    case 'commit':
      dataQuality = 0.7; // Line counts are estimated but reasonable
      break;
    case 'pr':
      dataQuality = 0.6; // PR data includes some estimates
      break;
    default:
      dataQuality = 0.5;
  }
  
  // Methodology certainty based on emission factor quality
  let methodologyCertainty = 0.7; // Base methodology confidence
  switch (emissionFactorConfidence) {
    case 'high': methodologyCertainty = 0.9; break;
    case 'medium': methodologyCertainty = 0.7; break;
    case 'low': methodologyCertainty = 0.5; break;
  }
  
  // Temporal accuracy based on how recent the data is
  const temporalAccuracy = hasLocationData ? 0.8 : 0.6;
  
  return {
    data_quality: Math.round(dataQuality * 100) / 100,
    methodology_certainty: Math.round(methodologyCertainty * 100) / 100,
    temporal_accuracy: Math.round(temporalAccuracy * 100) / 100
  };
}

/**
 * Determine overall confidence level
 */
function determineOverallConfidence(confidenceFactors: {
  data_quality: number;
  methodology_certainty: number;
  temporal_accuracy: number;
}): 'high' | 'medium' | 'low' {
  const average = (
    confidenceFactors.data_quality + 
    confidenceFactors.methodology_certainty + 
    confidenceFactors.temporal_accuracy
  ) / 3;
  
  if (average >= 0.8) return 'high';
  if (average >= 0.6) return 'medium';
  return 'low';
}

/**
 * Main carbon calculation function
 */
async function calculateCarbon(input: CarbonCalculationInput): Promise<CarbonCalculationResult> {
  const { databases } = initializeAppwrite();
  
  // Get emission factors for user's location
  const emissionFactor = await getEmissionFactor(databases, input.user_location);
  
  // Calculate energy consumption based on activity type
  let energyBreakdown: EnergyBreakdown;
  
  switch (input.activity_type) {
    case 'commit':
      energyBreakdown = calculateCommitEnergy(input.commit_data);
      break;
    case 'pr':
      energyBreakdown = calculatePrEnergy(input.pr_data);
      break;
    case 'ci_run':
      energyBreakdown = calculateCiEnergy(input.ci_data);
      break;
    default:
      energyBreakdown = { compute_kwh: 0, network_kwh: 0, storage_kwh: 0, cooling_kwh: 0, total_kwh: 0 };
  }
  
  // Calculate carbon emissions
  const carbonKg = energyBreakdown.total_kwh * emissionFactor.factor_kg_co2_per_kwh;
  
  // Calculate confidence factors
  const confidenceFactors = calculateConfidenceFactors(
    input.activity_type,
    emissionFactor.confidence_rating,
    !!input.user_location
  );
  
  // Determine overall confidence
  const overallConfidence = determineOverallConfidence(confidenceFactors);
  
  return {
    carbon_kg: Math.round(carbonKg * 1000000) / 1000000, // Round to 6 decimal places
    confidence: overallConfidence,
    energy_breakdown: energyBreakdown,
    emission_factors: emissionFactor,
    methodology_version: METHODOLOGY_VERSION,
    confidence_factors: confidenceFactors
  };
}

/**
 * Store calculation results in database
 */
async function storeCalculationResults(
  databases: Databases,
  input: CarbonCalculationInput,
  result: CarbonCalculationResult
): Promise<void> {
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace-main';
  
  try {
    // Update activity with carbon calculation
    await databases.updateDocument(
      databaseId,
      'activities',
      input.activity_id,
      {
        carbon_kg: result.carbon_kg,
        calculation_confidence: result.confidence
      }
    );
    
    // Create calculation record
    await databases.createDocument(
      databaseId,
      'calculations',
      'unique()',
      {
        activity_id: input.activity_id,
        emission_factors: JSON.stringify(result.emission_factors),
        energy_breakdown: JSON.stringify(result.energy_breakdown),
        methodology_version: result.methodology_version,
        calculation_timestamp: new Date().toISOString(),
        raw_data: JSON.stringify(input),
        confidence_factors: JSON.stringify(result.confidence_factors)
      }
    );
    
  } catch (error) {
    console.error('Failed to store calculation results:', error);
    throw error;
  }
}

/**
 * Trigger real-time updates
 */
async function triggerRealtimeUpdates(
  functions: Functions,
  userId: string,
  activityId: string,
  carbonKg: number
): Promise<void> {
  try {
    // This would trigger a realtime broadcast function
    // For now, we'll just log the intent
    console.log(`Would trigger realtime update for user ${userId}: activity ${activityId}, carbon ${carbonKg}kg`);
    
    // In a full implementation, this would call a realtime broadcast function
    // await functions.createExecution('realtime-broadcaster', JSON.stringify({
    //   channel: `user.${userId}`,
    //   event: 'carbon.calculated',
    //   data: { activity_id: activityId, carbon_kg: carbonKg }
    // }));
    
  } catch (error) {
    console.error('Failed to trigger realtime updates:', error);
    // Don't throw - this shouldn't fail the main calculation
  }
}

/**
 * Main function handler
 */
export default async function handler(context: AppwriteContext) {
  const { req, res, log, error } = context;
  
  try {
    const input: CarbonCalculationInput = JSON.parse(req.body || '{}');
    
    if (!input.activity_id || !input.user_id || !input.activity_type) {
      error('Missing required input parameters');
      return res.json({ error: 'Missing required parameters' }, 400);
    }
    
    log(`Calculating carbon footprint for activity: ${input.activity_id}`);
    
    // Initialize services
    const { databases, functions } = initializeAppwrite();
    
    // Calculate carbon footprint
    const result = await calculateCarbon(input);
    
    log(`Carbon calculation complete: ${result.carbon_kg}kg CO2e (confidence: ${result.confidence})`);
    
    // Store results
    await storeCalculationResults(databases, input, result);
    
    // Trigger real-time updates
    await triggerRealtimeUpdates(functions, input.user_id, input.activity_id, result.carbon_kg);
    
    return res.json({
      success: true,
      activity_id: input.activity_id,
      carbon_kg: result.carbon_kg,
      confidence: result.confidence,
      energy_breakdown: result.energy_breakdown,
      methodology_version: result.methodology_version
    });
    
  } catch (err: any) {
    error(`Carbon calculation failed: ${err.message}`);
    return res.json({
      error: 'Carbon calculation failed',
      message: err.message
    }, 500);
  }
}