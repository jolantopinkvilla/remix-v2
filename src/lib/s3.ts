import { S3Client } from '@aws-sdk/client-s3';

// Initialize S3 client with credentials from environment variables only
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'pv22-prod-eng';

// Helper function to convert S3 URI to HTTP URL
export const getS3Url = (s3Uri: string): string => {
  return s3Uri.replace('s3://', 'https://pv22-prod-eng-s3.s3.us-east-1.amazonaws.com/');
};
