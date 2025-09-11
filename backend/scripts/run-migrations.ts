#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { migrationManager } from '../src/shared/database/migration-manager';
import { logger } from '../src/shared/utils/logger';

// Load environment variables
dotenv.config();

async function runMigrations(): Promise<void> {
  try {
    console.log('🚀 Starting database migrations...\n');

    // Initialize migration manager
    await migrationManager.initialize();

    // Get current status
    const statusBefore = await migrationManager.getStatus();
    console.log(`📊 Migration Status:`);
    console.log(`   Total migrations: ${statusBefore.totalMigrations}`);
    console.log(`   Executed: ${statusBefore.executedMigrations}`);
    console.log(`   Pending: ${statusBefore.pendingMigrations}`);
    
    if (statusBefore.lastMigration) {
      console.log(`   Last migration: ${statusBefore.lastMigration.name} (${statusBefore.lastMigration.version})`);
    }
    console.log();

    if (statusBefore.pendingMigrations === 0) {
      console.log('✅ No migrations to execute. Database is up to date.');
      return;
    }

    // Parse command line arguments
    const args = process.argv.slice(2);
    const targetVersion = args.find(arg => arg.startsWith('--target='))?.split('=')[1];

    if (targetVersion) {
      console.log(`🎯 Migrating to version: ${targetVersion}`);
    } else {
      console.log(`📈 Migrating to latest version`);
    }
    console.log();

    // Run migrations
    await migrationManager.migrate(targetVersion);

    // Get status after migration
    const statusAfter = await migrationManager.getStatus();
    console.log(`\n✅ Migration completed successfully!`);
    console.log(`   Executed migrations: ${statusAfter.executedMigrations}`);
    console.log(`   Remaining pending: ${statusAfter.pendingMigrations}`);

    if (statusAfter.lastMigration) {
      console.log(`   Current version: ${statusAfter.lastMigration.version}`);
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    logger.error('Migration script failed', {
      error: {
        code: 'MIGRATION_SCRIPT_ERROR',
        message: error.message,
        stack: error.stack
      }
    });
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️  Migration interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Migration terminated');
  process.exit(143);
});

// Run the migrations
if (require.main === module) {
  runMigrations().then(() => {
    console.log('\n🎉 Migration process completed');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  });
}