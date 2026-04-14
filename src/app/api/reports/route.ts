import { NextResponse } from 'next/server';
import { s3Utils } from '@/lib/s3';

export async function GET() {
  try {
    // Get today's date for analytics
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Try to get cached analytics first
    let analytics = await s3Utils.getDailyAnalytics(today);
    
    // If no cached analytics, generate from events
    if (!analytics) {
      analytics = await s3Utils.generateAnalytics(today);
    }

    return NextResponse.json({
      totalVisitors: analytics.totalVisitors,
      actions: {
        visit: analytics.actions.visit || 0,
        upload: analytics.actions.upload || 0,
        download: analytics.actions.download || 0,
        share: analytics.actions.share || 0,
      },
      sources: analytics.sources.map(s => ({
        source: s.source || 'direct',
        count: s.count
      })),
    });
  } catch (error) {
    console.error('Reports Error:', error);
    // Return default data if S3 is not available
    return NextResponse.json({
      totalVisitors: 0,
      actions: {
        visit: 0,
        upload: 0,
        download: 0,
        share: 0,
      },
      sources: [],
    });
  }
}
