import { Client, Databases, Query, ID } from 'node-appwrite';
import fs from 'fs';
import path from 'path';
import { logger } from '@shared/utils/logger';

interface Migration {
  id: string;
  name: string;
  version: string;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
  executedAt?: string;
  checksum?: string;
}

interface MigrationRecord {
  $id: string;
  migrationId: string;
  name: string;
  version: string;
  description: string;
  executedAt: string;
  checksum: string;
  success: boolean;
  executionTime: number;
  error?: string;
}

interface DatabaseSchema {
  databaseId: string;
  collections: CollectionSchema[];
}

interface CollectionSchema {
  $id: string;
  name: string;
  enabled: boolean;
  documentSecurity: boolean;
  attributes: AttributeSchema[];
  indexes: IndexSchema[];
  permissions: string[];
}

interface AttributeSchema {
  key: string;
  type: string;
  status: string;
  required: boolean;
  array?: boolean;
  size?: number;
  default?: any;
  format?: string;
  options?: string[];
}

interface IndexSchema {
  key: string;
  type: string;
  status: string;
  attributes: string[];
  orders?: string[];
}

class AppwriteMigrationManager {
  private static instance: AppwriteMigrationManager;
  private client: Client;
  private databases: Databases;
  private databaseId: string;
  private migrationsCollection = 'migrations';
  private migrationsList: Migration[] = [];

  private constructor() {
    this.client = new Client();
    this.databases = new Databases(this.client);
    this.databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace';

    this.client
      .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(process.env.APPWRITE_PROJECT_ID || '')
      .setKey(process.env.APPWRITE_API_KEY || '');
  }

  public static getInstance(): AppwriteMigrationManager {
    if (!AppwriteMigrationManager.instance) {
      AppwriteMigrationManager.instance = new AppwriteMigrationManager();
    }
    return AppwriteMigrationManager.instance;
  }

  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing migration manager', {
        databaseId: this.databaseId,
        metadata: { migrationSystem: 'appwrite' }
      });

      await this.ensureMigrationsCollection();

      await this.loadMigrationFiles();

      logger.info('Migration manager initialized successfully', {
        totalMigrations: this.migrationsList.length,
        metadata: { migrationManagerReady: true }
      });

    } catch (error: any) {
      logger.error('Failed to initialize migration manager', {
        error: {
          code: 'MIGRATION_MANAGER_INIT_ERROR',
          message: error.message,
          stack: error.stack
        }
      });
      throw error;
    }
  }

  private async ensureMigrationsCollection(): Promise<void> {
    try {
      await this.databases.getCollection(this.databaseId, this.migrationsCollection);
      logger.info('Migrations collection already exists');
    } catch (error: any) {
      if (error.code === 404) {
        logger.info('Creating migrations collection');
        
        await this.databases.createCollection(
          this.databaseId,
          this.migrationsCollection,
          'Migrations',
          ['read("any")', 'write("any")'],
          false
        );

        const attributes = [
          { key: 'migrationId', type: 'string', size: 255, required: true },
          { key: 'name', type: 'string', size: 255, required: true },
          { key: 'version', type: 'string', size: 50, required: true },
          { key: 'description', type: 'string', size: 1000, required: false },
          { key: 'executedAt', type: 'datetime', required: true },
          { key: 'checksum', type: 'string', size: 64, required: true },
          { key: 'success', type: 'boolean', required: true },
          { key: 'executionTime', type: 'integer', required: true },
          { key: 'error', type: 'string', size: 2000, required: false }
        ];

        for (const attr of attributes) {
          await this.databases.createStringAttribute(
            this.databaseId,
            this.migrationsCollection,
            attr.key,
            attr.size || 255,
            attr.required
          );
        }

        await this.databases.createIndex(
          this.databaseId,
          this.migrationsCollection,
          'migration_id_index',
          'key',
          ['migrationId']
        );

        await this.databases.createIndex(
          this.databaseId,
          this.migrationsCollection,
          'version_index',
          'key',
          ['version']
        );

        logger.info('Migrations collection created successfully');
      } else {
        throw error;
      }
    }
  }

  private async loadMigrationFiles(): Promise<void> {
    const migrationsDir = path.join(__dirname, 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      logger.warn('Migrations directory does not exist', { path: migrationsDir });
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
      .sort();

    for (const file of files) {
      try {
        const migrationPath = path.join(migrationsDir, file);
        const migration = require(migrationPath);
        
        if (migration.default && typeof migration.default === 'object') {
          this.migrationsList.push(migration.default);
          logger.debug('Loaded migration', { file, id: migration.default.id });
        }
      } catch (error: any) {
        logger.error('Failed to load migration file', {
          file,
          error: { message: error.message }
        });
      }
    }

    logger.info('Migration files loaded', { count: this.migrationsList.length });
  }

  public async migrate(targetVersion?: string): Promise<void> {
    try {
      logger.info('Starting database migration', {
        targetVersion,
        totalMigrations: this.migrationsList.length
      });

      const executedMigrations = await this.getExecutedMigrations();
      const executedIds = new Set(executedMigrations.map(m => m.migrationId));

      let migrationsToExecute = this.migrationsList
        .filter(m => !executedIds.has(m.id))
        .sort((a, b) => a.version.localeCompare(b.version));

      if (targetVersion) {
        migrationsToExecute = migrationsToExecute
          .filter(m => m.version <= targetVersion);
      }

      if (migrationsToExecute.length === 0) {
        logger.info('No migrations to execute');
        return;
      }

      logger.info('Executing migrations', {
        count: migrationsToExecute.length,
        migrations: migrationsToExecute.map(m => ({ id: m.id, version: m.version }))
      });

      for (const migration of migrationsToExecute) {
        await this.executeMigration(migration);
      }

      logger.info('Database migration completed successfully', {
        executedCount: migrationsToExecute.length
      });

    } catch (error: any) {
      logger.error('Database migration failed', {
        error: {
          code: 'MIGRATION_EXECUTION_ERROR',
          message: error.message,
          stack: error.stack
        }
      });
      throw error;
    }
  }

  public async rollback(targetVersion?: string, steps?: number): Promise<void> {
    try {
      logger.info('Starting database rollback', { targetVersion, steps });

      const executedMigrations = await this.getExecutedMigrations();
      executedMigrations.sort((a, b) => b.version.localeCompare(a.version));

      let migrationsToRollback: Migration[] = [];

      if (steps) {
        const lastNMigrations = executedMigrations.slice(0, steps);
        migrationsToRollback = lastNMigrations
          .map(record => this.migrationsList.find(m => m.id === record.migrationId))
          .filter(m => m !== undefined) as Migration[];
      } else if (targetVersion) {
        const migrationsToRollbackRecords = executedMigrations
          .filter(m => m.version > targetVersion);
        migrationsToRollback = migrationsToRollbackRecords
          .map(record => this.migrationsList.find(m => m.id === record.migrationId))
          .filter(m => m !== undefined) as Migration[];
      } else {
        if (executedMigrations.length > 0) {
          const lastMigration = this.migrationsList.find(
            m => m.id === executedMigrations[0].migrationId
          );
          if (lastMigration) {
            migrationsToRollback = [lastMigration];
          }
        }
      }

      if (migrationsToRollback.length === 0) {
        logger.info('No migrations to rollback');
        return;
      }

      logger.info('Rolling back migrations', {
        count: migrationsToRollback.length,
        migrations: migrationsToRollback.map(m => ({ id: m.id, version: m.version }))
      });

      for (const migration of migrationsToRollback) {
        await this.rollbackMigration(migration);
      }

      logger.info('Database rollback completed successfully', {
        rolledBackCount: migrationsToRollback.length
      });

    } catch (error: any) {
      logger.error('Database rollback failed', {
        error: {
          code: 'MIGRATION_ROLLBACK_ERROR',
          message: error.message,
          stack: error.stack
        }
      });
      throw error;
    }
  }

  private async executeMigration(migration: Migration): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('Executing migration', {
        id: migration.id,
        name: migration.name,
        version: migration.version
      });

      await migration.up();

      const executionTime = Date.now() - startTime;

      await this.recordMigration(migration, true, executionTime);

      logger.info('Migration executed successfully', {
        id: migration.id,
        executionTime: `${executionTime}ms`
      });

    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      await this.recordMigration(migration, false, executionTime, error.message);

      logger.error('Migration failed', {
        id: migration.id,
        error: {
          message: error.message,
          stack: error.stack
        },
        executionTime: `${executionTime}ms`
      });

      throw error;
    }
  }

  private async rollbackMigration(migration: Migration): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info('Rolling back migration', {
        id: migration.id,
        name: migration.name,
        version: migration.version
      });

      await migration.down();

      await this.removeMigrationRecord(migration.id);

      const executionTime = Date.now() - startTime;

      logger.info('Migration rolled back successfully', {
        id: migration.id,
        executionTime: `${executionTime}ms`
      });

    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      logger.error('Migration rollback failed', {
        id: migration.id,
        error: {
          message: error.message,
          stack: error.stack
        },
        executionTime: `${executionTime}ms`
      });

      throw error;
    }
  }

  private async recordMigration(
    migration: Migration,
    success: boolean,
    executionTime: number,
    error?: string
  ): Promise<void> {
    const checksum = this.calculateChecksum(migration);

    await this.databases.createDocument(
      this.databaseId,
      this.migrationsCollection,
      ID.unique(),
      {
        migrationId: migration.id,
        name: migration.name,
        version: migration.version,
        description: migration.description,
        executedAt: new Date().toISOString(),
        checksum,
        success,
        executionTime,
        error: error || null
      }
    );
  }

  private async removeMigrationRecord(migrationId: string): Promise<void> {
    const response = await this.databases.listDocuments(
      this.databaseId,
      this.migrationsCollection,
      [Query.equal('migrationId', migrationId)]
    );

    if (response.documents.length > 0) {
      await this.databases.deleteDocument(
        this.databaseId,
        this.migrationsCollection,
        response.documents[0].$id
      );
    }
  }

  private async getExecutedMigrations(): Promise<MigrationRecord[]> {
    try {
      const response = await this.databases.listDocuments(
        this.databaseId,
        this.migrationsCollection,
        [
          Query.equal('success', true),
          Query.orderDesc('executedAt'),
          Query.limit(1000)
        ]
      );

      return response.documents as unknown as MigrationRecord[];
    } catch (error: any) {
      logger.error('Failed to get executed migrations', {
        error: { message: error.message }
      });
      return [];
    }
  }

  private calculateChecksum(migration: Migration): string {
    const content = `${migration.id}:${migration.version}:${migration.description}`;
    return Buffer.from(content).toString('base64');
  }

  public async getStatus(): Promise<{
    totalMigrations: number;
    executedMigrations: number;
    pendingMigrations: number;
    lastMigration?: MigrationRecord;
  }> {
    const executedMigrations = await this.getExecutedMigrations();
    const executedIds = new Set(executedMigrations.map(m => m.migrationId));
    const pendingCount = this.migrationsList.filter(m => !executedIds.has(m.id)).length;

    return {
      totalMigrations: this.migrationsList.length,
      executedMigrations: executedMigrations.length,
      pendingMigrations: pendingCount,
      lastMigration: executedMigrations[0]
    };
  }

  public getMigrationsList(): Migration[] {
    return [...this.migrationsList];
  }
}

export const migrationManager = AppwriteMigrationManager.getInstance();