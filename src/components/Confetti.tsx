import { useEffect, useRef } from 'react';
import { useGrubClub } from '../state/GrubClubContext';

interface Piece {
  x: number;
  y: number;
  r: number;
  color: string;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
}

const COLORS = ['#F6BD60', '#84A59D', '#F28482', '#F7EDE2', '#2F3E46'];

export function Confetti() {
  const { confettiTrigger } = useGrubClub();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (confettiTrigger === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pieces: Piece[] = [];
    for (let i = 0; i < 80; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -10 - Math.random() * 200,
        r: 4 + Math.random() * 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: 3 + Math.random() * 5,
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 8,
      });
    }

    let frame = 0;
    let raf = 0;
    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      pieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.vy += 0.1;
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate((p.rot * Math.PI) / 180);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
        ctx!.restore();
      });
      frame++;
      if (frame < 120) {
        raf = requestAnimationFrame(animate);
      } else {
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      }
    }
    animate();

    return () => cancelAnimationFrame(raf);
  }, [confettiTrigger]);

  return <canvas className="confetti-canvas" ref={canvasRef} />;
}
