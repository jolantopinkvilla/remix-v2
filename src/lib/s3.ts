import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client using the default credential provider chain.
// On EC2, this will automatically pick up credentials from the IAM Instance Profile.
// Locally, it will use environment variables or ~/.aws/credentials.
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

export const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'pv22-prod-eng-s3';

// Helper function to convert S3 URI to HTTP URL
export const getS3Url = (s3Uri: string): string => {
  // Use the generic S3 endpoint to handle different buckets
  return s3Uri.replace('s3://', 'https://s3.amazonaws.com/');
};

/**
 * Generates a presigned URL for an S3 URI
 */
export async function getPresignedUrl(s3Uri: string, expiresIn: number = 3600): Promise<string> {
  const parts = s3Uri.replace('s3://', '').split('/');
  const bucket = parts[0];
  const key = parts.slice(1).join('/');

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

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
