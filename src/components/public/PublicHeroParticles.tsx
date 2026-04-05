'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type PublicHeroParticlesProps = {
  className?: string;
};

type Particle = {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
};

const PARTICLE_COLOR = '#676A72';
const PARTICLE_COUNT = 96;

function createParticles(width: number, height: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 1.1 + 0.55,
    speedX: (Math.random() - 0.5) * 0.12,
    speedY: (Math.random() - 0.5) * 0.12,
  }));
}

export function PublicHeroParticles({ className }: PublicHeroParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    const parent = canvas.parentElement;

    if (!context || !parent) {
      return;
    }

    let width = 0;
    let height = 0;
    let dpr = 1;
    let animationFrame = 0;
    let particles: Particle[] = [];
    let reduceMotion = false;

    const mediaQuery =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    const updateMotionPreference = () => {
      reduceMotion = mediaQuery?.matches ?? false;
    };

    const resizeCanvas = () => {
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = createParticles(width, height);
    };

    const drawParticle = (particle: Particle) => {
      context.beginPath();
      context.fillStyle = PARTICLE_COLOR;
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    };

    const animate = () => {
      context.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        if (!reduceMotion) {
          particle.x += particle.speedX;
          particle.y += particle.speedY;

          if (particle.x <= 0 || particle.x >= width) {
            particle.speedX *= -1;
          }

          if (particle.y <= 0 || particle.y >= height) {
            particle.speedY *= -1;
          }
        }

        drawParticle(particle);
      });

      if (!reduceMotion) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
      animate();
    });

    updateMotionPreference();
    resizeCanvas();
    animate();
    resizeObserver.observe(parent);

    if (mediaQuery) {
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', updateMotionPreference);
      } else {
        mediaQuery.addListener(updateMotionPreference);
      }
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();

      if (mediaQuery) {
        if (typeof mediaQuery.removeEventListener === 'function') {
          mediaQuery.removeEventListener('change', updateMotionPreference);
        } else {
          mediaQuery.removeListener(updateMotionPreference);
        }
      }
    };
  }, []);

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden rounded-[2.2rem] [mask-image:radial-gradient(ellipse_at_center,transparent_30%,black_48%,black_74%,transparent_94%)]',
        className
      )}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-100" />
    </div>
  );
}
