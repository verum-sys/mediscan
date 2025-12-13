/**
 * Setup script for new DynamoDB tables required for:
 * - Disease Classification (ICD/SNOMED)
 * - User Feedback
 * - Symptom History
 * 
 * Run this script to create the new tables in your AWS DynamoDB
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    CreateTableCommand,
    DescribeTableCommand
} from "@aws-sdk/client-dynamodb";
import dotenv from 'dotenv';

dotenv.config();

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    } : undefined
});

const tables = [
    {
        TableName: "Classifications",
        KeySchema: [
            { AttributeName: "id", KeyType: "HASH" }
        ],
        AttributeDefinitions: [
            { AttributeName: "id", AttributeType: "S" },
            { AttributeName: "visit_id", AttributeType: "S" }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: "VisitIndex",
                KeySchema: [
                    { AttributeName: "visit_id", KeyType: "HASH" }
                ],
                Projection: {
                    ProjectionType: "ALL"
                },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    },
    {
        TableName: "Feedback",
        KeySchema: [
            { AttributeName: "id", KeyType: "HASH" }
        ],
        AttributeDefinitions: [
            { AttributeName: "id", AttributeType: "S" },
            { AttributeName: "target_id", AttributeType: "S" }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: "TargetIndex",
                KeySchema: [
                    { AttributeName: "target_id", KeyType: "HASH" }
                ],
                Projection: {
                    ProjectionType: "ALL"
                },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    },
    {
        TableName: "SymptomHistory",
        KeySchema: [
            { AttributeName: "id", KeyType: "HASH" }
        ],
        AttributeDefinitions: [
            { AttributeName: "id", AttributeType: "S" },
            { AttributeName: "visit_id", AttributeType: "S" },
            { AttributeName: "created_at", AttributeType: "S" }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: "VisitTimestampIndex",
                KeySchema: [
                    { AttributeName: "visit_id", KeyType: "HASH" },
                    { AttributeName: "created_at", KeyType: "RANGE" }
                ],
                Projection: {
                    ProjectionType: "ALL"
                },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    }
];

async function tableExists(tableName) {
    try {
        await client.send(new DescribeTableCommand({ TableName: tableName }));
        return true;
    } catch (error) {
        if (error.name === 'ResourceNotFoundException') {
            return false;
        }
        throw error;
    }
}

async function createTable(tableConfig) {
    const exists = await tableExists(tableConfig.TableName);

    if (exists) {
        console.log(`✓ Table "${tableConfig.TableName}" already exists`);
        return;
    }

    console.log(`Creating table "${tableConfig.TableName}"...`);

    try {
        await client.send(new CreateTableCommand(tableConfig));
        console.log(`✓ Table "${tableConfig.TableName}" created successfully`);
    } catch (error) {
        console.error(`✗ Failed to create table "${tableConfig.TableName}":`, error.message);
        throw error;
    }
}

async function setupNewTables() {
    console.log('========================================');
    console.log('MediScan AI - DynamoDB Table Setup');
    console.log('Creating new tables for Feature Update');
    console.log('========================================\n');

    for (const tableConfig of tables) {
        await createTable(tableConfig);
    }

    console.log('\n========================================');
    console.log('Setup Complete!');
    console.log('========================================');
    console.log('\nNew tables created:');
    console.log('  1. Classifications - Disease coding (ICD/SNOMED)');
    console.log('  2. Feedback - User ratings on AI outputs');
    console.log('  3. SymptomHistory - Symptom tracking over time');
    console.log('\nThese tables will be used for:');
    console.log('  ✓ ICD-10 and SNOMED CT code classification');
    console.log('  ✓ Thumbs up/down feedback collection');
    console.log('  ✓ Patient symptom timeline tracking');
    console.log('  ✓ Public health surveillance and outbreak detection');
}

// Run setup
setupNewTables().catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
});
