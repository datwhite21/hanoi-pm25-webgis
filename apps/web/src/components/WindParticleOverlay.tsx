import React, { useEffect, useRef } from 'react';

interface WindParticleOverlayProps {
  enabled: boolean;
  windSpeedKmh: number;
  windDirectionDeg: number; // Meteorological direction (from which wind blows)
}

interface Particle {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  speedMultiplier: number;
}

/**
 * Animated Wind Streamline Overlay inspired by Windy.com.
 * Driven strictly by real meteorological wind speed (km/h) and direction (deg) from Open-Meteo.
 */
export const WindParticleOverlay: React.FC<WindParticleOverlayProps> = ({
  enabled,
  windSpeedKmh,
  windDirectionDeg,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const particleCount = 110;
    const particles: Particle[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        age: Math.floor(Math.random() * 100),
        maxAge: 85 + Math.floor(Math.random() * 60),
        speedMultiplier: 0.75 + Math.random() * 0.5,
      });
    }

    // Convert meteorological wind direction (FROM) to vector movement angle (TO)
    const flowAngleRad = (((windDirectionDeg + 180) % 360) - 90) * (Math.PI / 180);
    const basePxPerFrame = Math.max(0.45, Math.min(3.2, windSpeedKmh * 0.14));
    const vx = Math.cos(flowAngleRad) * basePxPerFrame;
    const vy = Math.sin(flowAngleRad) * basePxPerFrame;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        const progress = p.age / p.maxAge;
        const alpha = Math.sin(progress * Math.PI) * 0.42;

        const tailLength = 14 * p.speedMultiplier;
        const startX = p.x - vx * tailLength;
        const startY = p.y - vy * tailLength;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = `rgba(186, 230, 253, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 1.4;
        ctx.lineCap = 'round';
        ctx.stroke();

        p.x += vx * p.speedMultiplier;
        p.y += vy * p.speedMultiplier;
        p.age += 1;

        if (
          p.age >= p.maxAge ||
          p.x < -20 ||
          p.x > canvas.width + 20 ||
          p.y < -20 ||
          p.y > canvas.height + 20
        ) {
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
          p.age = 0;
        }
      }

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [enabled, windSpeedKmh, windDirectionDeg]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-10"
      aria-hidden="true"
    />
  );
};

