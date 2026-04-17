// Using built-in fetch

async function testEnhancedTracking() {
    console.log('Testing enhanced tracking...');

    const userId = 'test-user-' + Date.now();
    const source = 'test-source';

    const events = [
        { type: 'upload_selfie', metadata: {} },
        { type: 'upload_full_body', metadata: {} },
        { type: 'select_bed', metadata: { bedType: 'Mango Juice' } },
    ];

    for (const event of events) {
        console.log(`Tracking event: ${event.type}...`);
        try {
            const response = await fetch('http://localhost:3000/api/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-forwarded-for': '1.2.3.4' // Mock IP
                },
                body: JSON.stringify({
                    userId,
                    type: event.type,
                    source,
                    metadata: event.metadata
                }),
            });

            const data = await response.json();
            if (response.ok) {
                console.log(`Success! Event stored with IP: ${data.event.ip}`);
                console.log('Event data:', JSON.stringify(data.event, null, 2));
            } else {
                console.error(`Failed to track event: ${data.error}`);
            }
        } catch (error) {
            console.error(`Error tracking event: ${error.message}`);
        }
    }
}

testEnhancedTracking();
