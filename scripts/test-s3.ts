import { uploadFile, getPresignedUrl } from '../src/lib/s3';

async function testS3() {
    console.log('Testing S3 operations...');

    const dummyBuffer = Buffer.from('test content');
    const fileName = 'test-file.txt';
    const contentType = 'text/plain';
    const sessionId = 'test-session-' + Date.now();

    try {
        // Test Upload
        console.log('1. Testing Upload...');
        const s3Uri = await uploadFile(dummyBuffer, fileName, contentType, sessionId);
        console.log('Upload successful!');
        console.log('S3 URI:', s3Uri);

        // Test Presigned URL
        console.log('\n2. Testing Presigned URL...');
        const presignedUrl = await getPresignedUrl(s3Uri);
        console.log('Presigned URL generated successfully!');
        console.log('Presigned URL:', presignedUrl);

        // Test accessibility (optional, but good to know)
        console.log('\n3. Testing Accessibility...');
        const response = await fetch(presignedUrl);
        if (response.ok) {
            console.log('Presigned URL is accessible!');
            const text = await response.text();
            console.log('Content:', text);
        } else {
            console.error('Presigned URL is NOT accessible. Status:', response.status);
        }

    } catch (error) {
        console.error('S3 operations failed:');
        console.error(error);
    }
}

testS3();
