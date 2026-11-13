import React, { useEffect, useRef, useState } from 'react';

// Google Identity Services, loaded from Google's CDN: no npm dependency needed.
const GIS_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize: (options: { client_id: string; callback: (r: GoogleCredentialResponse) => void }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Không tải được Google Sign-In'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

interface GoogleSignInButtonProps {
  /** Receives the Google ID token, to be sent to POST /api/v1/auth/google. */
  onCredential: (idToken: string) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ onCredential }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest callback without re-rendering Google's button.
  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    const state = { active: true };
    loadGoogleScript()
      .then(() => {
        const google = window.google;
        if (!state.active || !google || !containerRef.current) return;
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => callbackRef.current(response.credential),
        });
        google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: 320,
        });
      })
      .catch((e: Error) => {
        if (state.active) setError(e.message);
      });
    return () => {
      state.active = false;
    };
  }, []);

  if (!CLIENT_ID) {
    return (
      <p className="text-center text-xs text-slate-500">
        Đăng nhập Google chưa được bật (thiếu <code>VITE_GOOGLE_CLIENT_ID</code>).
      </p>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2">
      {/* The page uses `color-scheme: light dark`; Google's button iframe is light-only. A mismatch makes the
          browser paint an opaque white box behind the iframe, so this container is pinned to light. */}
      <div ref={containerRef} style={{ colorScheme: 'light' }} />
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
};