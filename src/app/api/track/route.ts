import { NextResponse } from 'next/server';
import { s3Utils, User, Event } from '@/lib/s3';

export async function POST(request: Request) {
  try {
    const { userId, type, source } = await request.json();

    if (!userId || !type) {
      return NextResponse.json({ error: 'Missing userId or type' }, { status: 400 });
    }

    // Try to use S3, but fail gracefully if it's not available
    try {
      // Ensure user exists
      let user = await s3Utils.getUser(userId);
      
      if (!user) {
        user = {
          id: userId,
          source: source || 'direct',
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        };
        await s3Utils.storeUser(user);
      } else {
        // Update last active time
        user.lastActive = new Date().toISOString();
        await s3Utils.storeUser(user);
      }

      // Record event
      const event: Event = {
        id: crypto.randomUUID(),
        userId: user.id,
        type: type as 'visit' | 'upload' | 'download' | 'share',
        timestamp: new Date().toISOString(),
        metadata: source ? { source } : undefined,
      };
      
      await s3Utils.storeEvent(event);

      return NextResponse.json({ success: true, event });
    } catch (s3Error) {
      // S3 not available, but don't break the app
      console.log('S3 tracking unavailable, continuing without tracking:', s3Error);
      return NextResponse.json({ success: true, message: 'Tracking unavailable' });
    }
  } catch (error) {
    console.error('Tracking Error:', error);
    // Don't return error status to avoid breaking the app
    return NextResponse.json({ success: true, message: 'Tracking disabled' });
  }
}
