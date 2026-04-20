import { uploadFile } from '../src/lib/s3';

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

        // Accessibility test is removed because we no longer generate presigned URLs 
        // and the bucket is likely private by default.

    } catch (error) {
        console.error('S3 operations failed:');
        console.error(error);
    }
}

testS3();
