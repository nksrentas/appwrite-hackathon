import { Client, Databases, Functions, Account, Permission, Role } from 'node-appwrite';

const requiredEnvVars = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID', 
  'APPWRITE_API_KEY',
  'APPWRITE_DATABASE_ID'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

export const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT!)
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

export const databases = new Databases(client);
export const functions = new Functions(client);
export const account = new Account(client);

export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;

export const COLLECTION_IDS = {
  USERS: 'users',
  ACTIVITIES: 'activities', 
  CALCULATIONS: 'calculations',
  LEADERBOARDS: 'leaderboards',
  EMISSION_FACTORS: 'emission_factors',
  CHALLENGES: 'challenges',
  INSIGHTS: 'insights'
} as const;

export const FUNCTION_IDS = {
  GITHUB_WEBHOOK: 'github-webhook',
  CARBON_CALCULATOR: 'carbon-calculator',
  LEADERBOARD_UPDATER: 'leaderboard-updater',
  API_INTEGRATIONS: 'api-integrations',
  ANALYTICS_PROCESSOR: 'analytics-processor',
  INSIGHT_GENERATOR: 'insight-generator'
} as const;

export class PermissionHelper {
  static userRead(userId: string) {
    return Permission.read(Role.user(userId));
  }

  static userWrite(userId: string) {
    return Permission.write(Role.user(userId));
  }

  static userUpdate(userId: string) {
    return Permission.update(Role.user(userId));
  }

  static userDelete(userId: string) {
    return Permission.delete(Role.user(userId));
  }

  static publicRead() {
    return Permission.read(Role.any());
  }

  static anonymousRead() {
    return Permission.read(Role.guests());
  }

  static userOwned(userId: string) {
    return [
      this.userRead(userId),
      this.userWrite(userId),
      this.userUpdate(userId),
      this.userDelete(userId)
    ];
  }

  static publicReadUserWrite(userId: string) {
    return [
      this.publicRead(),
      this.userWrite(userId),
      this.userUpdate(userId),
      this.userDelete(userId)
    ];
  }

  static publicReadOnly() {
    return [this.publicRead()];
  }
}

export class AppwriteError extends Error {
  constructor(
    message: string,
    public code?: string,
    public type?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppwriteError';
  }
}

export async function executeAppwriteOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    console.error(`Appwrite operation failed [${operationName}]:`, error);
    
    if (error.code) {
      throw new AppwriteError(
        error.message || `${operationName} failed`,
        error.code,
        error.type,
        error
      );
    }
    
    if (error.message?.includes('fetch')) {
      throw new AppwriteError(
        `Network error during ${operationName}`,
        'NETWORK_ERROR',
        'CONNECTION',
        error
      );
    }
    
    throw new AppwriteError(
      `Unknown error during ${operationName}`,
      'UNKNOWN_ERROR',
      'SYSTEM',
      error
    );
  }
}

export class QueryBuilder {
  private queries: string[] = [];

  equal(attribute: string, value: any) {
    this.queries.push(`equal("${attribute}", ${JSON.stringify(value)})`);
    return this;
  }

  notEqual(attribute: string, value: any) {
    this.queries.push(`notEqual("${attribute}", ${JSON.stringify(value)})`);
    return this;
  }

  greaterThan(attribute: string, value: any) {
    this.queries.push(`greaterThan("${attribute}", ${JSON.stringify(value)})`);
    return this;
  }

  lessThan(attribute: string, value: any) {
    this.queries.push(`lessThan("${attribute}", ${JSON.stringify(value)})`);
    return this;
  }

  greaterEqual(attribute: string, value: any) {
    this.queries.push(`greaterEqual("${attribute}", ${JSON.stringify(value)})`);
    return this;
  }

  lessEqual(attribute: string, value: any) {
    this.queries.push(`lessEqual("${attribute}", ${JSON.stringify(value)})`);
    return this;
  }

  between(attribute: string, start: any, end: any) {
    this.queries.push(`between("${attribute}", ${JSON.stringify(start)}, ${JSON.stringify(end)})`);
    return this;
  }

  isNull(attribute: string) {
    this.queries.push(`isNull("${attribute}")`);
    return this;
  }

  isNotNull(attribute: string) {
    this.queries.push(`isNotNull("${attribute}")`);
    return this;
  }

  search(attribute: string, value: string) {
    this.queries.push(`search("${attribute}", "${value}")`);
    return this;
  }

  orderDesc(attribute: string) {
    this.queries.push(`orderDesc("${attribute}")`);
    return this;
  }

  orderAsc(attribute: string) {
    this.queries.push(`orderAsc("${attribute}")`);
    return this;
  }

  limit(value: number) {
    this.queries.push(`limit(${value})`);
    return this;
  }

  offset(value: number) {
    this.queries.push(`offset(${value})`);
    return this;
  }

  build(): string[] {
    return this.queries;
  }

  reset(): QueryBuilder {
    this.queries = [];
    return this;
  }
}

export class RealtimeHelper {
  static channelForUser(userId: string) {
    return `user.${userId}`;
  }

  static channelForCollection(collectionId: string) {
    return `databases.${DATABASE_ID}.collections.${collectionId}.documents`;
  }

  static channelForDocument(collectionId: string, documentId: string) {
    return `databases.${DATABASE_ID}.collections.${collectionId}.documents.${documentId}`;
  }

  static channelForLeaderboard(periodType: string) {
    return `leaderboard.${periodType}`;
  }
}

export class BatchProcessor {
  private operations: (() => Promise<any>)[] = [];
  private maxBatchSize: number = 25;

  add(operation: () => Promise<any>) {
    this.operations.push(operation);
    return this;
  }

  async execute(): Promise<any[]> {
    const results = [];
    
    for (let i = 0; i < this.operations.length; i += this.maxBatchSize) {
      const batch = this.operations.slice(i, i + this.maxBatchSize);
      const batchResults = await Promise.allSettled(
        batch.map(op => op())
      );
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('Batch operation failed:', result.reason);
          results.push({ error: result.reason });
        }
      }
    }
    
    return results;
  }

  clear() {
    this.operations = [];
    return this;
  }
}

export class CacheManager {
  private cache = new Map<string, { data: any; expires: number }>();
  private defaultTTL = 5 * 60 * 1000;

  set(key: string, data: any, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expires });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new CacheManager();

setInterval(() => cache.cleanup(), 10 * 60 * 1000);