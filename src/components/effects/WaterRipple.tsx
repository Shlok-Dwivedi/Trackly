import { useEffect, useRef } from 'react';

interface Ripple {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

export function WaterRipple({
  color = '139,92,246',
  maxRadius = 180,
  speed = 4,
  minDistance = 80,
  maxRipples = 10,
}: {
  color?: string;
  maxRadius?: number;
  speed?: number;
  minDistance?: number;
  maxRipples?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const ripples: Ripple[] = [];
    let raf: number;
    let lastX = -999, lastY = -999;

    function setSize() {
      canvas!.width  = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    setSize();
    window.addEventListener('resize', setSize);

    function addRipple(x: number, y: number) {
      if (ripples.length >= maxRipples) ripples.shift();
      ripples.push({ x, y, radius: 0, alpha: 0.6 });
    }

    function onMouseMove(e: MouseEvent) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (Math.sqrt(dx*dx + dy*dy) < minDistance) return;
      lastX = e.clientX;
      lastY = e.clientY;
      addRipple(e.clientX, e.clientY);
    }

    function onClick(e: MouseEvent) {
      addRipple(e.clientX, e.clientY);
      setTimeout(() => addRipple(e.clientX + 8, e.clientY + 8), 60);
      setTimeout(() => addRipple(e.clientX - 8, e.clientY - 8), 120);
    }

    function loop() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += speed;
        r.alpha  -= speed / maxRadius;
        if (r.alpha <= 0) { ripples.splice(i, 1); continue; }

        // filled gradient
        const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.radius);
        g.addColorStop(0,   `rgba(${color},${(r.alpha * 0.4).toFixed(3)})`);
        g.addColorStop(0.6, `rgba(${color},${(r.alpha * 0.15).toFixed(3)})`);
        g.addColorStop(1,   `rgba(${color},0)`);
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        // ring stroke
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${color},${(r.alpha * 0.5).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', setSize);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('click', onClick);
    };
  }, [color, maxRadius, speed, minDistance, maxRipples]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        pointerEvents: 'none',
        zIndex: 9998,
      }}
      aria-hidden="true"
    />
  );
}

export default WaterRipple;
