import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Initialize S3 client with credentials from environment variables only
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export const BUCKET_NAME = (process.env.S3_BUCKET_NAME && process.env.S3_BUCKET_NAME !== 'pv22-prod-eng')
  ? process.env.S3_BUCKET_NAME
  : 'pv22-prod-eng-s3';

// Helper function to convert S3 URI to HTTP URL
export const getS3Url = (s3Uri: string): string => {
  // Use the generic S3 endpoint to handle different buckets
  return s3Uri.replace('s3://', 'https://s3.amazonaws.com/');
};

/**
 * Uploads a file to S3 under a session-specific prefix
 */
export async function uploadFile(
  fileBuffer: Buffer | Uint8Array,
  fileName: string,
  contentType: string,
  sessionId: string
): Promise<string> {
  const key = `uploads/${sessionId}/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  return `s3://${BUCKET_NAME}/${key}`;
}
