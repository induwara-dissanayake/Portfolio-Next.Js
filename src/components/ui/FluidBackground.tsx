"use client";
import { useEffect, useRef } from 'react';

export default function FluidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      const { width, height } = canvas;
      
      // Create gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, `hsla(${240 + Math.sin(time * 0.002) * 60}, 100%, 50%, 0.1)`);
      gradient.addColorStop(0.5, `hsla(${300 + Math.cos(time * 0.003) * 60}, 100%, 50%, 0.05)`);
      gradient.addColorStop(1, `hsla(${180 + Math.sin(time * 0.001) * 60}, 100%, 50%, 0.1)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Add moving blobs
      for (let i = 0; i < 3; i++) {
        const x = width * 0.5 + Math.sin(time * 0.001 + i * 2) * width * 0.3;
        const y = height * 0.5 + Math.cos(time * 0.002 + i * 3) * height * 0.2;
        const radius = 100 + Math.sin(time * 0.003 + i) * 50;

        const blobGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        blobGradient.addColorStop(0, `hsla(${270 + i * 30}, 100%, 70%, 0.3)`);
        blobGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = blobGradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      time++;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-20 opacity-30"
      style={{ filter: 'blur(60px)' }}
    />
  );
}
