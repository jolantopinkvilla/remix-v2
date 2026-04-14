import { NextResponse } from 'next/server';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Template video URLs mapping (S3 URIs)
const templateVideos = {
  cinematic: 's3://pinkvilla-media-assets/videos/cinematic-template.mp4',
  social: 's3://pinkvilla-media-assets/videos/social-template.mp4',
  business: 's3://pinkvilla-media-assets/videos/business-template.mp4',
  artistic: 's3://pinkvilla-media-assets/videos/artistic-template.mp4',
  minimal: 's3://pinkvilla-media-assets/videos/minimal-template.mp4'
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const template = formData.get('template') as string || 'cinematic';

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

    // Simulate processing delay (3 seconds) to demonstrate processing UI
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Return template-specific video
    const videoUrl = templateVideos[template as keyof typeof templateVideos] || templateVideos.cinematic;
    
    // Convert S3 URI to HTTP URL for frontend
    const httpVideoUrl = videoUrl.replace('s3://', 'https://s3.amazonaws.com/');

    return NextResponse.json({ 
        success: true, 
        videoUrl: httpVideoUrl,
        template: template
    });

  } catch (error) {
    console.error('Generation Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
