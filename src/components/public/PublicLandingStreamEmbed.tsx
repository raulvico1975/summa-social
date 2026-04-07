'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface PublicLandingStreamEmbedProps {
  customerCode: string;
  videoUid: string;
  alt: string;
  poster?: string;
  autoPlay: boolean;
  muted: boolean;
  loop: boolean;
  controls: boolean;
  className: string;
}

function toAbsolutePosterUrl(poster: string | undefined) {
  if (!poster || typeof window === 'undefined') {
    return undefined;
  }

  if (/^https?:\/\//i.test(poster)) {
    return poster;
  }

  return undefined;
}

export function PublicLandingStreamEmbed({
  customerCode,
  videoUid,
  alt,
  poster,
  autoPlay,
  muted,
  loop,
  controls,
  className,
}: PublicLandingStreamEmbedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisibleForPlayback, setIsVisibleForPlayback] = useState(!autoPlay);
  const [hasLoadedFrame, setHasLoadedFrame] = useState(false);
  const hasValidStream = customerCode.length > 0 && videoUid.length > 0;

  useEffect(() => {
    if (!autoPlay) {
      setIsVisibleForPlayback(true);
      return;
    }

    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsVisibleForPlayback(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisibleForPlayback(entry?.isIntersecting ?? false);
      },
      {
        threshold: 0.35,
        rootMargin: '160px 0px',
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [autoPlay, customerCode, videoUid]);

  useEffect(() => {
    if (!isVisibleForPlayback) {
      setHasLoadedFrame(false);
    }
  }, [isVisibleForPlayback]);

  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams();

    if (autoPlay) {
      params.set('autoplay', 'true');
      params.set('preload', 'metadata');
    }

    if (muted) {
      params.set('muted', 'true');
    }

    if (loop) {
      params.set('loop', 'true');
    }

    if (!controls) {
      params.set('controls', 'false');
    }

    const posterUrl = toAbsolutePosterUrl(poster);
    if (posterUrl) {
      params.set('poster', posterUrl);
    }

    return `https://customer-${customerCode}.cloudflarestream.com/${videoUid}/iframe?${params.toString()}`;
  }, [autoPlay, controls, customerCode, loop, muted, poster, videoUid]);

  return (
    <div ref={containerRef} className="relative">
      {poster ? (
        <img
          src={poster}
          alt={alt}
          className={`${className} transition-opacity duration-300 ${
            hasLoadedFrame ? 'opacity-0' : 'opacity-100'
          }`}
        />
      ) : (
        <div className={`${className} bg-slate-950`} aria-hidden="true" />
      )}

      {isVisibleForPlayback && hasValidStream ? (
        <iframe
          className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${
            hasLoadedFrame ? 'opacity-100' : 'opacity-0'
          }`}
          src={iframeSrc}
          title={alt}
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
          style={{ border: 'none' }}
          onLoad={() => setHasLoadedFrame(true)}
        />
      ) : null}
    </div>
  );
}
