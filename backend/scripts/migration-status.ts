#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { migrationManager } from '../src/shared/database/migration-manager';

// Load environment variables
dotenv.config();

async function showMigrationStatus(): Promise<void> {
  try {
    console.log('📊 EcoTrace Database Migration Status\n');

    // Initialize migration manager
    await migrationManager.initialize();

    // Get current status
    const status = await migrationManager.getStatus();
    const migrations = migrationManager.getMigrationsList();

    // Show summary
    console.log('🎯 Summary:');
    console.log(`   Total migrations: ${status.totalMigrations}`);
    console.log(`   Executed: ${status.executedMigrations}`);
    console.log(`   Pending: ${status.pendingMigrations}`);
    console.log();

    if (status.lastMigration) {
      console.log('🏆 Last Migration:');
      console.log(`   Name: ${status.lastMigration.name}`);
      console.log(`   Version: ${status.lastMigration.version}`);
      console.log(`   Executed: ${new Date(status.lastMigration.executedAt).toLocaleString()}`);
      console.log(`   Execution time: ${status.lastMigration.executionTime}ms`);
      console.log();
    }

    // Show all migrations
    console.log('📋 All Migrations:');
    console.log('   ID'.padEnd(25) + 'Version'.padEnd(12) + 'Name'.padEnd(30) + 'Status');
    console.log('   ' + '─'.repeat(80));

    const executedMigrationIds = new Set();
    // Note: In a real implementation, you would get the executed migrations here
    
    migrations.forEach(migration => {
      const status = executedMigrationIds.has(migration.id) ? '✅ Executed' : '⏳ Pending';
      const line = `   ${migration.id.padEnd(25)}${migration.version.padEnd(12)}${migration.name.padEnd(30)}${status}`;
      console.log(line);
    });

    console.log();

    if (status.pendingMigrations > 0) {
      console.log(`🚀 Run 'npm run migrate' to execute ${status.pendingMigrations} pending migration(s)`);
    } else {
      console.log('✅ Database is up to date!');
    }

  } catch (error: any) {
    console.error('\n❌ Failed to get migration status:', error.message);
    process.exit(1);
  }
}

// Run the status check
if (require.main === module) {
  showMigrationStatus().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  });
}