import { useEffect, useRef } from "react";

interface LatticeNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  phase: number;
}

/**
 * Subtle molecular / pharmacokinetic telemetry lattice canvas.
 * - Responds softly to pointer proximity
 * - Pauses automatically when `document.hidden` is true
 * - Renders a clean static single frame for `prefers-reduced-motion: reduce`
 */
export function ClinicalLatticeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: -9999, y: -9999, active: false };
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let rafId = 0;
    let nodes: LatticeNode[] = [];

    const palette = [
      "rgba(45, 212, 191, 0.52)",  // Clinical Teal
      "rgba(56, 189, 248, 0.44)",  // Diagnostic Sky
      "rgba(167, 139, 250, 0.36)", // Neural Violet
    ];

    const seedNodes = () => {
      const count = width < 640 ? 22 : width < 1100 ? 34 : 48;
      nodes = Array.from({ length: count }, (_, i) => ({
        x: ((i * 197.3) % 100) / 100 * width,
        y: ((i * 131.7 + 19) % 100) / 100 * height,
        vx: (Math.sin(i * 1.7) * 0.16),
        vy: (Math.cos(i * 2.1) * 0.14),
        radius: 1.4 + (i % 3) * 0.65,
        color: palette[i % palette.length],
        phase: i * 0.9,
      }));
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedNodes();
    };

    const drawFrame = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Subtle pharmacokinetic harmonic baseline across upper-right half
      ctx.save();
      ctx.beginPath();
      const waveY = height * 0.56;
      for (let x = 0; x <= width; x += 14) {
        const norm = x / Math.max(width, 1);
        const pkEnvelope = Math.exp(-Math.pow((norm - 0.68) * 3.1, 2));
        const y =
          waveY -
          pkEnvelope * 52 * Math.sin(norm * 14 - time * 0.00045) -
          Math.sin(norm * 5 + time * 0.00025) * 8;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(45, 212, 191, 0.08)";
      ctx.lineWidth = 1.25;
      ctx.stroke();
      ctx.restore();

      const maxDist = width < 640 ? 115 : 155;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!reducedMotion) {
          n.x += n.vx;
          n.y += n.vy;

          if (pointer.active) {
            const dx = pointer.x - n.x;
            const dy = pointer.y - n.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 170 && dist > 1) {
              n.x -= (dx / dist) * 0.22;
              n.y -= (dy / dist) * 0.22;
            }
          }

          if (n.x < -16) n.x = width + 16;
          if (n.x > width + 16) n.x = -16;
          if (n.y < -16) n.y = height + 16;
          if (n.y > height + 16) n.y = -16;
        }

        // Molecular lattice connections
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const dist = Math.hypot(dx, dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.14;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.strokeStyle = `rgba(94, 234, 212, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }

        // Pointer resonance highlight
        if (pointer.active) {
          const pd = Math.hypot(pointer.x - n.x, pointer.y - n.y);
          if (pd < 180) {
            const alpha = (1 - pd / 180) * 0.24;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }

        const pulse = reducedMotion ? 1 : 0.82 + 0.28 * Math.sin(time * 0.0014 + n.phase);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
      }
    };

    const tick = (time: number) => {
      if (!document.hidden) {
        drawFrame(time);
      }
      rafId = requestAnimationFrame(tick);
    };

    const onPointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = pointer.x >= 0 && pointer.x <= width && pointer.y >= 0 && pointer.y <= height;
    };

    const onPointerLeave = () => {
      pointer.active = false;
    };

    resize();
    if (reducedMotion) {
      drawFrame(0);
    } else {
      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onPointerMove, { passive: true });
    document.addEventListener("mouseleave", onPointerLeave);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onPointerMove);
      document.removeEventListener("mouseleave", onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="lp-lattice-canvas" aria-hidden="true" />;
}
