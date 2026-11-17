import { useEffect, useState } from 'react';
import type { ImgHTMLAttributes, ReactNode } from 'react';
import './story-motion.css';

/** Remounted by the scene checkpoint; motion never advances gameplay itself. */
export function SceneTransition({ children }: { children: ReactNode }) {
  const [entering, setEntering] = useState(() => typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (!entering) return;
    // Also release controls if the animation is cancelled or motion settings change.
    const timer = window.setTimeout(() => setEntering(false), 280);
    return () => window.clearTimeout(timer);
  }, [entering]);
  return <fieldset aria-label="Thẻ truyện" aria-busy={entering} disabled={entering}
    onAnimationEnd={event => { if (event.target === event.currentTarget) setEntering(false); }}
    className="mini-game-scene min-w-0 space-y-6 rounded-3xl border border-clay-200 bg-clay-100/70 p-4 clay-soft sm:p-7">
    {children}
  </fieldset>;
}

function LoadedPhoto({ onLoad, className = '', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState(false);
  return <img {...props} data-loaded={loaded} className={'mini-game-photo ' + className}
    onLoad={event => { setLoaded(true); onLoad?.(event); }} />;
}

/** A changed source starts a fresh fade, including images already in browser cache. */
export function TransitionImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  return <LoadedPhoto key={props.src} {...props} />;
}