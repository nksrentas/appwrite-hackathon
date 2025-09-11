#!/usr/bin/env node

require('dotenv').config();
const { Client, Databases, Permission, Role } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

const COLLECTION_IDS = {
  USERS: 'users',
  ACTIVITIES: 'activities',
  CALCULATIONS: 'calculations',
  LEADERBOARDS: 'leaderboards',
  EMISSION_FACTORS: 'emission_factors',
  CHALLENGES: 'challenges',
  INSIGHTS: 'insights'
};

const collections = [
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
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'activity_id', type: 'string', size: 255, required: true },
      { key: 'carbon_kg', type: 'float', required: true },
      { key: 'confidence', type: 'enum', elements: ['high', 'medium', 'low'], required: true },
      { key: 'methodology', type: 'string', size: 500, required: true },
      { key: 'data_sources', type: 'string', size: 2000, required: true },
      { key: 'calculation_metadata', type: 'string', size: 2000, required: false },
      { key: 'timestamp', type: 'datetime', required: true },
    ],
    indexes: [
      { key: 'user_calculations', type: 'key', attributes: ['user_id'] },
      { key: 'activity_calculation', type: 'key', attributes: ['activity_id'] },
      { key: 'timestamp_index', type: 'key', attributes: ['timestamp'], orders: ['DESC'] }
    ]
  },
  {
    $id: COLLECTION_IDS.LEADERBOARDS,
    name: 'Leaderboards',
    attributes: [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'period_type', type: 'enum', elements: ['daily', 'weekly', 'monthly', 'yearly'], required: true },
      { key: 'period_start', type: 'datetime', required: true },
      { key: 'period_end', type: 'datetime', required: true },
      { key: 'total_carbon_kg', type: 'float', required: true },
      { key: 'total_activities', type: 'integer', required: true },
      { key: 'rank', type: 'integer', required: true },
      { key: 'percentile', type: 'float', required: false },
    ],
    indexes: [
      { key: 'user_leaderboard', type: 'key', attributes: ['user_id'] },
      { key: 'period_rank', type: 'key', attributes: ['period_type', 'rank'] },
      { key: 'period_carbon', type: 'key', attributes: ['period_type', 'total_carbon_kg'], orders: ['ASC', 'ASC'] }
    ]
  },
  {
    $id: COLLECTION_IDS.EMISSION_FACTORS,
    name: 'Emission Factors',
    attributes: [
      { key: 'source', type: 'enum', elements: ['epa_egrid', 'electricity_maps', 'aws_carbon', 'gcp_carbon'], required: true },
      { key: 'region', type: 'string', size: 100, required: true },
      { key: 'factor_type', type: 'string', size: 100, required: true },
      { key: 'value_kg_co2_kwh', type: 'float', required: true },
      { key: 'confidence_level', type: 'enum', elements: ['high', 'medium', 'low'], required: true },
      { key: 'last_updated', type: 'datetime', required: true },
      { key: 'metadata', type: 'string', size: 2000, required: false },
    ],
    indexes: [
      { key: 'source_region', type: 'key', attributes: ['source', 'region'] },
      { key: 'factor_type_index', type: 'key', attributes: ['factor_type'] },
      { key: 'last_updated_index', type: 'key', attributes: ['last_updated'], orders: ['DESC'] }
    ]
  },
  {
    $id: COLLECTION_IDS.CHALLENGES,
    name: 'Challenges',
    attributes: [
      { key: 'title', type: 'string', size: 200, required: true },
      { key: 'description', type: 'string', size: 1000, required: true },
      { key: 'challenge_type', type: 'enum', elements: ['reduction', 'efficiency', 'streak', 'milestone'], required: true },
      { key: 'target_value', type: 'float', required: true },
      { key: 'target_unit', type: 'string', size: 50, required: true },
      { key: 'start_date', type: 'datetime', required: true },
      { key: 'end_date', type: 'datetime', required: true },
      { key: 'is_active', type: 'boolean', required: true, default: true },
      { key: 'reward_points', type: 'integer', required: true },
    ],
    indexes: [
      { key: 'challenge_type_index', type: 'key', attributes: ['challenge_type'] },
      { key: 'active_challenges', type: 'key', attributes: ['is_active'] },
      { key: 'date_range', type: 'key', attributes: ['start_date', 'end_date'] }
    ]
  },
  {
    $id: COLLECTION_IDS.INSIGHTS,
    name: 'Insights',
    attributes: [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'insight_type', type: 'enum', elements: ['trend', 'comparison', 'recommendation', 'achievement'], required: true },
      { key: 'title', type: 'string', size: 200, required: true },
      { key: 'description', type: 'string', size: 1000, required: true },
      { key: 'data_points', type: 'string', size: 2000, required: false },
      { key: 'confidence_score', type: 'float', required: true },
      { key: 'priority', type: 'enum', elements: ['high', 'medium', 'low'], required: true },
      { key: 'is_read', type: 'boolean', required: true, default: false },
      { key: 'generated_at', type: 'datetime', required: true },
    ],
    indexes: [
      { key: 'user_insights', type: 'key', attributes: ['user_id'] },
      { key: 'insight_type_index', type: 'key', attributes: ['insight_type'] },
      { key: 'priority_unread', type: 'key', attributes: ['priority', 'is_read'] },
      { key: 'generated_at_index', type: 'key', attributes: ['generated_at'], orders: ['DESC'] }
    ]
  }
];

async function createCollection(schema) {
  console.log(`Creating collection: ${schema.name} (${schema.$id})`);
  
  try {
    // Create collection
    await databases.createCollection(
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
        }
        
        console.log(`    ✓ Attribute '${attr.key}' created`);
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        if (error.code === 409) {
          console.log(`    ! Attribute '${attr.key}' already exists`);
        } else {
          console.error(`    ✗ Failed to create attribute '${attr.key}':`, error.message);
        }
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

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
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (error) {
          if (error.code === 409) {
            console.log(`    ! Index '${index.key}' already exists`);
          } else {
            console.error(`    ✗ Failed to create index '${index.key}':`, error.message);
          }
        }
      }
    }

    console.log(`✓ Collection '${schema.name}' setup completed\n`);

  } catch (error) {
    if (error.code === 409) {
      console.log(`! Collection '${schema.name}' already exists\n`);
    } else {
      console.error(`✗ Failed to create collection '${schema.name}':`, error.message);
      throw error;
    }
  }
}

async function setupDatabase() {
  console.log('🚀 Starting Appwrite database setup...\n');
  console.log(`Database ID: ${DATABASE_ID}\n`);

  try {
    await databases.get(DATABASE_ID);
    console.log('✓ Database connection successful\n');

    for (const collection of collections) {
      await createCollection(collection);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log('🎉 Database setup completed successfully!');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

setupDatabase()
  .then(() => {
    console.log('\n✅ Setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });