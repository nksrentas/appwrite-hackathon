#!/usr/bin/env tsx

import { config } from 'dotenv';
import path from 'path';
// Load environment variables
config({ path: path.join(__dirname, '../.env') });

import { client, databases, DATABASE_ID, COLLECTION_IDS } from '../src/shared/config/appwrite';
import { Permission, Role } from 'node-appwrite';

interface CollectionSchema {
  $id: string;
  name: string;
  attributes: Array<{
    key: string;
    type: 'string' | 'integer' | 'float' | 'boolean' | 'datetime' | 'email' | 'ip' | 'url' | 'enum';
    size?: number;
    required?: boolean;
    array?: boolean;
    default?: any;
    elements?: string[];
  }>;
  indexes?: Array<{
    key: string;
    type: 'key' | 'fulltext' | 'unique';
    attributes: string[];
    orders?: string[];
  }>;
}

const collections: CollectionSchema[] = [
  {
    $id: COLLECTION_IDS.USERS,
    name: 'Users',
    attributes: [
      { key: 'github_id', type: 'string', size: 255, required: true },
      { key: 'username', type: 'string', size: 255, required: true },
      { key: 'email', type: 'email', required: true },
      { key: 'avatar_url', type: 'url', required: false },
      { key: 'location', type: 'string', size: 1000, required: false },
      { key: 'preferences', type: 'string', size: 2000, required: true },
      { key: 'github_tokens', type: 'string', size: 2000, required: false },
      { key: 'onboarding_completed', type: 'boolean', required: true, default: false },
    ],
    indexes: [
      { key: 'github_id_index', type: 'unique', attributes: ['github_id'] },
      { key: 'username_index', type: 'key', attributes: ['username'] },
      { key: 'email_index', type: 'unique', attributes: ['email'] }
    ]
  },
  {
    $id: COLLECTION_IDS.ACTIVITIES,
    name: 'Activities',
    attributes: [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'type', type: 'enum', elements: ['commit', 'pr', 'ci_run', 'deployment', 'local_dev'], required: true },
      { key: 'repository', type: 'string', size: 2000, required: false },
      { key: 'commit', type: 'string', size: 2000, required: false },
      { key: 'ci_data', type: 'string', size: 2000, required: false },
      { key: 'local_data', type: 'string', size: 2000, required: false },
      { key: 'carbon_kg', type: 'float', required: true },
      { key: 'calculation_confidence', type: 'enum', elements: ['high', 'medium', 'low'], required: true },
      { key: 'timestamp', type: 'datetime', required: true },
    ],
    indexes: [
      { key: 'user_activities', type: 'key', attributes: ['user_id'] },
      { key: 'timestamp_index', type: 'key', attributes: ['timestamp'], orders: ['DESC'] },
      { key: 'type_index', type: 'key', attributes: ['type'] },
      { key: 'user_timestamp', type: 'key', attributes: ['user_id', 'timestamp'], orders: ['ASC', 'DESC'] }
    ]
  },
  {
    $id: COLLECTION_IDS.CALCULATIONS,
    name: 'Calculations',
    attributes: [
      { key: 'activity_id', type: 'string', size: 255, required: true },
      { key: 'emission_factors', type: 'string', size: 2000, required: true },
      { key: 'energy_breakdown', type: 'string', size: 2000, required: true },
      { key: 'methodology_version', type: 'string', size: 50, required: true },
      { key: 'calculation_timestamp', type: 'datetime', required: true },
      { key: 'raw_data', type: 'string', size: 5000, required: true },
      { key: 'confidence_factors', type: 'string', size: 1000, required: true },
    ],
    indexes: [
      { key: 'activity_calculation', type: 'unique', attributes: ['activity_id'] },
      { key: 'timestamp_index', type: 'key', attributes: ['calculation_timestamp'], orders: ['DESC'] }
    ]
  },
  {
    $id: COLLECTION_IDS.LEADERBOARDS,
    name: 'Leaderboards',
    attributes: [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'period_type', type: 'enum', elements: ['daily', 'weekly', 'monthly', 'all_time'], required: true },
      { key: 'period_start', type: 'datetime', required: true },
      { key: 'period_end', type: 'datetime', required: true },
      { key: 'metrics', type: 'string', size: 2000, required: true },
      { key: 'rank', type: 'integer', required: true },
      { key: 'total_participants', type: 'integer', required: true },
      { key: 'percentile', type: 'float', required: true },
      { key: 'last_updated', type: 'datetime', required: true },
    ],
    indexes: [
      { key: 'user_period', type: 'key', attributes: ['user_id', 'period_type'] },
      { key: 'period_rank', type: 'key', attributes: ['period_type', 'rank'], orders: ['ASC', 'ASC'] },
      { key: 'last_updated_index', type: 'key', attributes: ['last_updated'], orders: ['DESC'] }
    ]
  },
  {
    $id: COLLECTION_IDS.EMISSION_FACTORS,
    name: 'Emission Factors',
    attributes: [
      { key: 'region', type: 'string', size: 500, required: true },
      { key: 'factor_kg_co2_per_kwh', type: 'float', required: true },
      { key: 'renewable_percentage', type: 'float', required: true },
      { key: 'source', type: 'string', size: 1000, required: true },
      { key: 'valid_from', type: 'datetime', required: true },
      { key: 'valid_until', type: 'datetime', required: true },
      { key: 'last_updated', type: 'datetime', required: true },
      { key: 'confidence_rating', type: 'enum', elements: ['high', 'medium', 'low'], required: true },
    ],
    indexes: [
      { key: 'region_index', type: 'key', attributes: ['region'] },
      { key: 'valid_period', type: 'key', attributes: ['valid_from', 'valid_until'] },
      { key: 'last_updated_index', type: 'key', attributes: ['last_updated'], orders: ['DESC'] }
    ]
  },
  {
    $id: COLLECTION_IDS.CHALLENGES,
    name: 'Challenges',
    attributes: [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'description', type: 'string', size: 2000, required: true },
      { key: 'category', type: 'enum', elements: ['efficiency', 'awareness', 'reduction', 'methodology'], required: true },
      { key: 'criteria', type: 'string', size: 1000, required: true },
      { key: 'badge_image_id', type: 'string', size: 255, required: false },
      { key: 'points', type: 'integer', required: true },
      { key: 'start_date', type: 'datetime', required: true },
      { key: 'end_date', type: 'datetime', required: true },
      { key: 'participants', type: 'string', size: 10000, required: false, array: true },
      { key: 'completions', type: 'string', size: 10000, required: false },
    ],
    indexes: [
      { key: 'category_index', type: 'key', attributes: ['category'] },
      { key: 'date_range', type: 'key', attributes: ['start_date', 'end_date'] },
      { key: 'active_challenges', type: 'key', attributes: ['end_date'], orders: ['DESC'] }
    ]
  },
  {
    $id: COLLECTION_IDS.INSIGHTS,
    name: 'Insights',
    attributes: [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'type', type: 'enum', elements: ['efficiency_tip', 'pattern_analysis', 'comparison', 'achievement'], required: true },
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'description', type: 'string', size: 2000, required: true },
      { key: 'data_points', type: 'string', size: 2000, required: true },
      { key: 'actions', type: 'string', size: 5000, required: true },
      { key: 'shown_to_user', type: 'boolean', required: true, default: false },
      { key: 'dismissed', type: 'boolean', required: true, default: false },
      { key: 'acted_upon', type: 'boolean', required: true, default: false },
      { key: 'valid_until', type: 'datetime', required: true },
    ],
    indexes: [
      { key: 'user_insights', type: 'key', attributes: ['user_id'] },
      { key: 'type_index', type: 'key', attributes: ['type'] },
      { key: 'user_unshown', type: 'key', attributes: ['user_id', 'shown_to_user'] },
      { key: 'valid_until_index', type: 'key', attributes: ['valid_until'], orders: ['ASC'] }
    ]
  }
];

async function createCollection(schema: CollectionSchema): Promise<void> {
  console.log(`Creating collection: ${schema.name} (${schema.$id})`);
  
  try {
    // Create collection with public read permissions and user write permissions
    const collection = await databases.createCollection(
      DATABASE_ID,
      schema.$id,
      schema.name,
      [
        Permission.read(Role.any()),
        Permission.write(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users())
      ]
    );

    console.log(`✓ Collection '${schema.name}' created successfully`);

    // Add attributes
    for (const attr of schema.attributes) {
      try {
        console.log(`  Adding attribute: ${attr.key} (${attr.type})`);
        
        switch (attr.type) {
          case 'string':
            await databases.createStringAttribute(
              DATABASE_ID,
              schema.$id,
              attr.key,
              attr.size || 255,
              attr.required || false,
              attr.default,
              attr.array || false
            );
            break;
            
          case 'email':
            await databases.createEmailAttribute(
              DATABASE_ID,
              schema.$id,
              attr.key,
              attr.required || false,
              attr.default,
              attr.array || false
            );
            break;
            
          case 'url':
            await databases.createUrlAttribute(
              DATABASE_ID,
              schema.$id,
              attr.key,
              attr.required || false,
              attr.default,
              attr.array || false
            );
            break;
            
          case 'integer':
            await databases.createIntegerAttribute(
              DATABASE_ID,
              schema.$id,
              attr.key,
              attr.required || false,
              undefined,
              undefined,
              attr.default,
              attr.array || false
            );
            break;
            
          case 'float':
            await databases.createFloatAttribute(
              DATABASE_ID,
              schema.$id,
              attr.key,
              attr.required || false,
              undefined,
              undefined,
              attr.default,
              attr.array || false
            );
            break;
            
          case 'boolean':
            await databases.createBooleanAttribute(
              DATABASE_ID,
              schema.$id,
              attr.key,
              attr.required || false,
              attr.default,
              attr.array || false
            );
            break;
            
          case 'datetime':
            await databases.createDatetimeAttribute(
              DATABASE_ID,
              schema.$id,
              attr.key,
              attr.required || false,
              attr.default,
              attr.array || false
            );
            break;
            
          case 'enum':
            if (!attr.elements) {
              throw new Error(`Enum attribute ${attr.key} missing elements`);
            }
            await databases.createEnumAttribute(
              DATABASE_ID,
              schema.$id,
              attr.key,
              attr.elements,
              attr.required || false,
              attr.default,
              attr.array || false
            );
            break;
            
          default:
            console.warn(`  Warning: Unknown attribute type ${attr.type} for ${attr.key}`);
        }
        
        console.log(`    ✓ Attribute '${attr.key}' created`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`    ! Attribute '${attr.key}' already exists`);
        } else {
          console.error(`    ✗ Failed to create attribute '${attr.key}':`, error.message);
        }
      }
    }

    // Wait a bit before creating indexes
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create indexes
    if (schema.indexes) {
      for (const index of schema.indexes) {
        try {
          console.log(`  Creating index: ${index.key}`);
          
          await databases.createIndex(
            DATABASE_ID,
            schema.$id,
            index.key,
            index.type,
            index.attributes,
            index.orders
          );
          
          console.log(`    ✓ Index '${index.key}' created`);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error: any) {
          if (error.code === 409) {
            console.log(`    ! Index '${index.key}' already exists`);
          } else {
            console.error(`    ✗ Failed to create index '${index.key}':`, error.message);
          }
        }
      }
    }

    console.log(`✓ Collection '${schema.name}' setup completed\n`);

  } catch (error: any) {
    if (error.code === 409) {
      console.log(`! Collection '${schema.name}' already exists, updating attributes...\n`);
      
      // Try to add missing attributes to existing collection
      for (const attr of schema.attributes) {
        try {
          console.log(`  Checking attribute: ${attr.key}`);
          // This will fail if attribute exists, which is what we want
          switch (attr.type) {
            case 'string':
              await databases.createStringAttribute(
                DATABASE_ID,
                schema.$id,
                attr.key,
                attr.size || 255,
                attr.required || false,
                attr.default,
                attr.array || false
              );
              break;
          }
          console.log(`    ✓ Added missing attribute '${attr.key}'`);
        } catch (attrError: any) {
          if (attrError.code === 409) {
            console.log(`    ! Attribute '${attr.key}' already exists`);
          }
        }
      }
    } else {
      console.error(`✗ Failed to create collection '${schema.name}':`, error.message);
      throw error;
    }
  }
}

async function setupDatabase(): Promise<void> {
  console.log('🚀 Starting Appwrite database setup...\n');
  console.log(`Database ID: ${DATABASE_ID}\n`);

  try {
    // Test connection
    await databases.get(DATABASE_ID);
    console.log('✓ Database connection successful\n');

    // Create collections sequentially to avoid rate limiting
    for (const collection of collections) {
      await createCollection(collection);
      // Longer delay between collections
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('🎉 Database setup completed successfully!');
    console.log('\nCollections created:');
    collections.forEach(c => console.log(`  - ${c.name} (${c.$id})`));

  } catch (error: any) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

// Run the setup
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('\n✅ Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Setup failed:', error);
      process.exit(1);
    });
}

export { setupDatabase, collections };