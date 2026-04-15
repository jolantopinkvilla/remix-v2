import { NextResponse } from 'next/server';
import { uploadFile, getS3Url } from '@/lib/s3';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Template video URLs mapping (S3 URIs)
const templateVideos = {
  cinematic: 's3://pv22-prod-eng-s3/demo/bed-template-5mb.mp4',
  social: 's3://pv22-prod-eng-s3/demo/bed-template-5mb.mp4',
  business: 's3://pv22-prod-eng-s3/demo/bed-template-5mb.mp4',
  artistic: 's3://pv22-prod-eng-s3/demo/bed-template-5mb.mp4',
  minimal: 's3://pv22-prod-eng-s3/demo/bed-template-5mb.mp4'
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const template = formData.get('template') as string || 'cinematic';
    const sessionId = formData.get('sessionId') as string || 'anonymous';

    if (!file) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Uploaded file must be an image' }, { status: 400 });
    }

    // Convert File to Buffer for S3 upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    let s3Uri = '';
    try {
      s3Uri = await uploadFile(buffer, file.name, file.type, sessionId);
      console.log(`Uploaded file to S3: ${s3Uri}`);
    } catch (s3Error) {
      console.error('S3 Upload Error:', s3Error);
      // Fallback or continue if S3 fails? 
      // For now, we'll fail if S3 upload fails as it's a requested feature.
      return NextResponse.json({ error: 'Failed to upload image to S3' }, { status: 500 });
    }

    // Simulate processing delay (3 seconds) to demonstrate processing UI
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Return template-specific video
    const videoUrl = templateVideos[template as keyof typeof templateVideos] || templateVideos.cinematic;

    // Convert S3 URI to HTTP URL for frontend
    const httpVideoUrl = getS3Url(videoUrl);

    return NextResponse.json({
      success: true,
      videoUrl: httpVideoUrl,
      template: template,
      uploadedImage: getS3Url(s3Uri)
    });

  } catch (error) {
    console.error('Generation Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
