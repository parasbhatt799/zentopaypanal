import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  twinkleSpeed: number;
  color: string;
  glowColor: string;
  
  // Custom properties for Light Mode 3D Geometric Glass shapes
  shapeType?: 'sphere' | 'ring' | 'capsule' | 'triangle' | 'cloud';
  angle?: number;
  spinSpeed?: number;
  parallaxFactor?: number;
}

export const StarryBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles: Particle[] = [];

    // Initialize particles based on active theme mode
    const initParticles = (isLight: boolean) => {
      particles.length = 0;
      if (isLight) {
        // Light Mode: Soft Floating Clouds (Daytime Sky Atmosphere style)
        const count = 7;
        for (let i = 0; i < count; i++) {
          const radius = Math.random() * 40 + 40; // Cloud scale size
          particles.push({
            x: Math.random() * width,
            y: Math.random() * (height * 0.65), // Upper part of the sky
            vx: Math.random() * 0.06 + 0.04, // Very slow drifting movement
            vy: (Math.random() - 0.5) * 0.01,
            radius: radius,
            alpha: Math.random() * 0.12 + 0.1, // Soft opacity
            twinkleSpeed: 0,
            color: 'rgba(255, 255, 255, 0.45)',
            glowColor: 'rgba(255, 255, 255, 0.9)',
            shapeType: 'cloud',
          });
        }
      } else {
        // Dark Mode: Twinkling Constellation Stars
        const count = Math.min(95, Math.floor((width * height) / 16000));
        const starTemplates = [
          { fill: 'rgba(255, 255, 255, ', glow: 'rgba(255, 255, 255, 0.95)' }, // Pure White
          { fill: 'rgba(224, 231, 255, ', glow: 'rgba(129, 140, 248, 0.9)' },  // Indigo Pale Blue
          { fill: 'rgba(199, 210, 254, ', glow: 'rgba(99, 102, 241, 0.85)' },  // Indigo Soft Blue
          { fill: 'rgba(168, 85, 247, ',  glow: 'rgba(168, 85, 247, 0.9)' },   // Purple Accent
        ];
        for (let i = 0; i < count; i++) {
          const template = Math.random() > 0.15 
            ? starTemplates[Math.floor(Math.random() * 3)] 
            : starTemplates[3];

          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.12,
            vy: (Math.random() - 0.5) * 0.12,
            radius: Math.random() * 2.8 + 1.4,
            alpha: Math.random(),
            twinkleSpeed: 0.003 + Math.random() * 0.008,
            color: template.fill,
            glowColor: template.glow,
          });
        }
      }
    };

    let currentIsLight = document.documentElement.classList.contains('light');
    initParticles(currentIsLight);

    // Watch for dynamic class changes on document root to toggle particle systems live
    const observer = new MutationObserver(() => {
      const isLight = document.documentElement.classList.contains('light');
      if (isLight !== currentIsLight) {
        currentIsLight = isLight;
        initParticles(isLight);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const mouse = { x: null as number | null, y: null as number | null, radius: 140 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const isLight = currentIsLight;

      if (isLight) {
        // 1. Draw warm sun glow in the top-right corner
        const sunGrad = ctx.createRadialGradient(width, 0, 10, width, 0, 320);
        sunGrad.addColorStop(0, 'rgba(255, 244, 215, 0.32)');
        sunGrad.addColorStop(0.3, 'rgba(255, 238, 185, 0.15)');
        sunGrad.addColorStop(0.6, 'rgba(255, 238, 185, 0.04)');
        sunGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(width, 0, 320, 0, Math.PI * 2);
        ctx.fill();

        // 2. Draw rotating warm sunbeams/light rays
        ctx.save();
        ctx.translate(width, 0);
        const time = Date.now() * 0.00007; // Very slow rotation
        ctx.rotate(time);
        ctx.fillStyle = 'rgba(255, 245, 215, 0.015)'; // extremely faint yellow/white rays
        for (let r = 0; r < 8; r++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(r * Math.PI / 4 - 0.12) * width, Math.sin(r * Math.PI / 4 - 0.12) * width);
          ctx.lineTo(Math.cos(r * Math.PI / 4 + 0.12) * width, Math.sin(r * Math.PI / 4 + 0.12) * width);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

      }

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        // Normal drift movement physics
        p1.x += p1.vx;
        p1.y += p1.vy;

        // Wrap around boundaries (offset 3x radius for wider clouds)
        const offset = p1.radius * 3;
        if (p1.x < -offset) p1.x = width + offset;
        if (p1.x > width + offset) p1.x = -offset;
        if (p1.y < -offset) p1.y = height + offset;
        if (p1.y > height + offset) p1.y = -offset;

        if (isLight) {
          // Apply a tiny parallax to clouds for a 3D sky depth effect!
          let drawX = p1.x;
          let drawY = p1.y;
          if (mouse.x !== null && mouse.y !== null) {
            drawX += (mouse.x - width / 2) * 0.02;
            drawY += (mouse.y - height / 2) * 0.015;
          }

          if (p1.shapeType === 'cloud') {
            ctx.save();
            ctx.shadowColor = 'rgba(255, 255, 255, 0.45)';
            ctx.shadowBlur = 12;
            ctx.fillStyle = `rgba(255, 255, 255, ${p1.alpha * 0.7})`;

            const x = drawX;
            const y = drawY;
            const r = p1.radius;

            ctx.beginPath();
            // Left bump
            ctx.arc(x - r * 0.5, y + r * 0.1, r * 0.6, 0, Math.PI * 2);
            // Center tall bump
            ctx.arc(x, y - r * 0.2, r * 0.8, 0, Math.PI * 2);
            // Right bump
            ctx.arc(x + r * 0.6, y + r * 0.1, r * 0.55, 0, Math.PI * 2);
            // Flat bottom fillers
            ctx.arc(x - r * 0.2, y + r * 0.3, r * 0.5, 0, Math.PI * 2);
            ctx.arc(x + r * 0.2, y + r * 0.3, r * 0.5, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        } else {
          // Dark Mode: Twinkle opacity ranges
          p1.alpha += p1.twinkleSpeed;
          if (p1.alpha > 1.0 || p1.alpha < 0.2) {
            p1.twinkleSpeed = -p1.twinkleSpeed;
          }

          // Draw star particle
          ctx.beginPath();
          ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
          ctx.shadowBlur = p1.radius * 3.5;
          ctx.shadowColor = p1.glowColor;
          ctx.fillStyle = `${p1.color}${p1.alpha * 0.95})`;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Draw constellation lines
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 125) {
              const alpha = (1 - dist / 125) * 0.28;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(165, 180, 252, ${alpha})`;
              ctx.lineWidth = 0.65;
              ctx.stroke();
            }
          }

          // Star-to-mouse connection lasers
          if (mouse.x !== null && mouse.y !== null) {
            const dx = p1.x - mouse.x;
            const dy = p1.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < mouse.radius) {
              const alpha = (1 - dist / mouse.radius) * 0.38;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(mouse.x, mouse.y);
              ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
              ctx.lineWidth = 0.75;
              ctx.stroke();
            }
          }
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

export default StarryBackground;
