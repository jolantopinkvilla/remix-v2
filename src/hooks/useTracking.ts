export function useTracking() {
  const trackAction = async (type: 'visit' | 'upload' | 'download' | 'share' | 'videoGenerate') => {
    try {
      // Get or create a userId stored in localStorage to mock sessions
      let userId = localStorage.getItem('img2vid_user_id');
      if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem('img2vid_user_id', userId);
      }

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch('/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, type, source: document.referrer || 'direct' }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch (err) {
      // Silently ignore tracking errors - they shouldn't break the app
      // Only log in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Tracking unavailable (non-critical):', err);
      }
    }
  };

  return { trackAction };
}
