import { NextResponse } from 'next/server';
import { generateAnalytics } from '@/lib/dynamo';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') || 'today') as 'today' | '7d' | '30d';

    const analytics = await generateAnalytics(range);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Reports Error:', error);
    // Return default data if DynamoDB is not available
    return NextResponse.json({
      totalVisitors: 0,
      actions: {
        visit: 0,
        upload: 0,
        download: 0,
        share: 0,
        videoGenerate: 0,
      },
      sources: [],
      timeseries: [],
    });
  }
}
