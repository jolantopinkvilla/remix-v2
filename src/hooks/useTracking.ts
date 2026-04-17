import { useState, useEffect } from 'react';

export function useTracking() {
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Get or create a sessionId stored in sessionStorage (resets when tab closes)
    let sId = sessionStorage.getItem('img2vid_session_id');
    if (!sId) {
      sId = crypto.randomUUID();
      sessionStorage.setItem('img2vid_session_id', sId);
    }
    setSessionId(sId);
  }, []);

  const trackAction = async (
    type: 'visit' | 'upload' | 'download' | 'share' | 'videoGenerate' | 'upload_selfie' | 'upload_full_body' | 'select_bed',
    metadata?: Record<string, unknown>
  ) => {
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
        body: JSON.stringify({
          userId,
          type,
          source: document.referrer || 'direct',
          sessionId: sessionStorage.getItem('img2vid_session_id') || '',
          metadata
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch (err) {
      // Silently ignore tracking errors - they shouldn't break the app
      if (process.env.NODE_ENV === 'development') {
        console.log('Tracking unavailable (non-critical):', err);
      }
    }
  };

  return { trackAction, sessionId };
}
