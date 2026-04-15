import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from "@aws-sdk/client-dynamodb";

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const EVENTS_TABLE = process.env.DYNAMO_EVENTS_TABLE || 'pinkvilla-events';
const USERS_TABLE = process.env.DYNAMO_USERS_TABLE || 'pinkvilla-users';

async function main() {
  console.log("Checking existing tables...");
  const { TableNames } = await ddbClient.send(new ListTablesCommand({}));
  console.log("Existing tables:", TableNames);

  // 1. Create Users Table
  if (!TableNames.includes(USERS_TABLE)) {
    console.log(`Creating ${USERS_TABLE}...`);
    await ddbClient.send(new CreateTableCommand({
      TableName: USERS_TABLE,
      AttributeDefinitions: [
        { AttributeName: "userId", AttributeType: "S" }
      ],
      KeySchema: [
        { AttributeName: "userId", KeyType: "HASH" }
      ],
      BillingMode: "PAY_PER_REQUEST",
    }));
    console.log(`${USERS_TABLE} created successfully!`);
  } else {
    console.log(`${USERS_TABLE} already exists.`);
  }

  // 2. Create Events Table
  if (!TableNames.includes(EVENTS_TABLE)) {
    console.log(`Creating ${EVENTS_TABLE}...`);
    await ddbClient.send(new CreateTableCommand({
      TableName: EVENTS_TABLE,
      AttributeDefinitions: [
        { AttributeName: "date", AttributeType: "S" },
        { AttributeName: "eventId", AttributeType: "S" }
      ],
      KeySchema: [
        { AttributeName: "date", KeyType: "HASH" },
        { AttributeName: "eventId", KeyType: "RANGE" }
      ],
      BillingMode: "PAY_PER_REQUEST",
    }));
    console.log(`${EVENTS_TABLE} created successfully!`);
  } else {
    console.log(`${EVENTS_TABLE} already exists.`);
  }
}

main().catch(console.error);
