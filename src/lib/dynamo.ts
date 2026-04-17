import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client — uses same AWS creds as S3
const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const EVENTS_TABLE = process.env.DYNAMO_EVENTS_TABLE || 'pinkvilla-events';
const USERS_TABLE = process.env.DYNAMO_USERS_TABLE || 'pinkvilla-users';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DynamoUser {
  userId: string;
  source: string;
  createdAt: string;
  lastActive: string;
}

export interface DynamoEvent {
  date: string;       // partition key: YYYY-MM-DD
  eventId: string;    // sort key: unique id
  userId: string;
  type: 'visit' | 'upload' | 'download' | 'share' | 'videoGenerate' | 'upload_selfie' | 'upload_full_body' | 'select_bed';
  source: string;
  timestamp: string;  // ISO string
  ip?: string;        // User IP address
  metadata?: Record<string, unknown>;
}

export interface AnalyticsReport {
  totalVisitors: number;
  actions: {
    visit: number;
    upload: number;
    upload_selfie: number;
    upload_full_body: number;
    select_bed: number;
    download: number;
    share: number;
    videoGenerate: number;
  };
  sources: Array<{ source: string; count: number }>;
  bedTypes: Array<{ type: string; count: number }>;
  timeseries: Array<{
    date: string;
    visits: number;
    uploads: number;
    downloads: number;
    shares: number;
  }>;
}

// ─── User Operations ─────────────────────────────────────────────────────────

export async function putUser(user: DynamoUser): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: USERS_TABLE,
      Item: user,
    })
  );
}

export async function getUser(userId: string): Promise<DynamoUser | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId },
    })
  );
  return (result.Item as DynamoUser) || null;
}

// ─── Event Operations ────────────────────────────────────────────────────────

export async function putEvent(event: DynamoEvent): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: EVENTS_TABLE,
      Item: event,
    })
  );
}

export async function queryEventsByDate(date: string): Promise<DynamoEvent[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: EVENTS_TABLE,
      KeyConditionExpression: '#d = :date',
      ExpressionAttributeNames: { '#d': 'date' },
      ExpressionAttributeValues: { ':date': date },
    })
  );
  return (result.Items as DynamoEvent[]) || [];
}

// Query events across a range of dates (calls queryEventsByDate for each day)
export async function queryEventsForRange(
  startDate: string,
  endDate: string
): Promise<DynamoEvent[]> {
  const dates = getDateRange(startDate, endDate);
  const allEvents: DynamoEvent[] = [];

  // Query each date in parallel (max concurrency = number of days)
  const results = await Promise.all(
    dates.map((date) => queryEventsByDate(date))
  );
  for (const events of results) {
    allEvents.push(...events);
  }

  return allEvents;
}

// ─── Analytics Aggregation ───────────────────────────────────────────────────

export async function generateAnalytics(
  range: 'today' | '7d' | '30d' = 'today'
): Promise<AnalyticsReport> {
  const now = new Date();
  const endDate = formatDate(now);

  let startDate: string;
  if (range === '7d') {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    startDate = formatDate(start);
  } else if (range === '30d') {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    startDate = formatDate(start);
  } else {
    startDate = endDate;
  }

  const events = await queryEventsForRange(startDate, endDate);

  // Aggregate
  const uniqueUsers = new Set<string>();
  const actions = {
    visit: 0,
    upload: 0,
    upload_selfie: 0,
    upload_full_body: 0,
    select_bed: 0,
    download: 0,
    share: 0,
    videoGenerate: 0
  };
  const sourceMap: Record<string, number> = {};
  const bedTypeMap: Record<string, number> = {};
  const dayMap: Record<string, { visits: number; uploads: number; downloads: number; shares: number }> = {};

  // Pre-fill dayMap with all dates in range
  const dates = getDateRange(startDate, endDate);
  for (const d of dates) {
    dayMap[d] = { visits: 0, uploads: 0, downloads: 0, shares: 0 };
  }

  for (const event of events) {
    uniqueUsers.add(event.userId);

    if (event.type in actions) {
      actions[event.type as keyof typeof actions]++;
    }

    // Legacy 'upload' event also counts towards total uploads in timeseries
    if (event.type === 'upload' || event.type === 'upload_selfie' || event.type === 'upload_full_body') {
      const day = event.date;
      if (dayMap[day]) dayMap[day].uploads++;
    }

    if (event.type === 'select_bed' && event.metadata?.bedType) {
      const bedType = String(event.metadata.bedType);
      bedTypeMap[bedType] = (bedTypeMap[bedType] || 0) + 1;
    }

    const src = event.source || 'direct';
    sourceMap[src] = (sourceMap[src] || 0) + 1;

    // Timeseries
    const day = event.date;
    if (dayMap[day]) {
      if (event.type === 'visit') dayMap[day].visits++;
      if (event.type === 'download') dayMap[day].downloads++;
      if (event.type === 'share') dayMap[day].shares++;
    }
  }

  const sources = Object.entries(sourceMap)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  const bedTypes = Object.entries(bedTypeMap)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const timeseries = dates.map((date) => ({
    date,
    ...dayMap[date],
  }));

  return {
    totalVisitors: uniqueUsers.size,
    actions,
    sources,
    bedTypes,
    timeseries,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + 'T00:00:00Z');
  const endDate = new Date(end + 'T00:00:00Z');

  while (current <= endDate) {
    dates.push(formatDate(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}
