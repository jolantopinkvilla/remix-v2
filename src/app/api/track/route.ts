import { NextResponse } from 'next/server';
import { putEvent, putUser, getUser, type DynamoEvent, type DynamoUser } from '@/lib/dynamo';

export async function POST(request: Request) {
  try {
    const { userId, type, source } = await request.json();

    if (!userId || !type) {
      return NextResponse.json({ error: 'Missing userId or type' }, { status: 400 });
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      // Upsert user
      let user = await getUser(userId);

      if (!user) {
        const newUser: DynamoUser = {
          userId,
          source: source || 'direct',
          createdAt: now.toISOString(),
          lastActive: now.toISOString(),
        };
        await putUser(newUser);
      } else {
        user.lastActive = now.toISOString();
        await putUser(user);
      }

      // Record event
      const event: DynamoEvent = {
        date: dateStr,
        eventId: crypto.randomUUID(),
        userId,
        type: type as DynamoEvent['type'],
        source: source || 'direct',
        timestamp: now.toISOString(),
      };

      await putEvent(event);

      return NextResponse.json({ success: true, event });
    } catch (dynamoError) {
      // DynamoDB not available — don't break the app
      console.log('DynamoDB tracking unavailable, continuing without tracking:', dynamoError);
      return NextResponse.json({ success: true, message: 'Tracking unavailable' });
    }
  } catch (error) {
    console.error('Tracking Error:', error);
    return NextResponse.json({ success: true, message: 'Tracking disabled' });
  }
}
