import { NextResponse } from 'next/server';
import { getPresignedUrl } from '@/lib/s3';

// This route now only handles generating presigned URLs for the video player
// The actual Scrolo API call is handled directly on the client-side
export async function GET() {
  try {
    // Generate a presigned URL for the placeholder video
    const videoS3Uri = 's3://pv22-prod-eng-s3/demo/bed-template-5mb.mp4';
    const presignedVideoUrl = await getPresignedUrl(videoS3Uri);

    return NextResponse.json({
      success: true,
      videoUrl: presignedVideoUrl
    });
  } catch (error) {
    console.error('Video URL Error:', error);
    return NextResponse.json({ error: 'Failed to generate video URL', success: false }, { status: 500 });
  }
}
