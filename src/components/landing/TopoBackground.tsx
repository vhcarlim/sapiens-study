import { useEffect, useRef } from "react";

/** Animated topographic contour lines drawn on a 2D canvas, tinted with the theme's primary color. */
export function TopoBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let t = 0;
    const mouse = { x: 0.5, y: 0.4 };
    let scroll = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = e.clientY / window.innerHeight;
    };
    const onScroll = () => (scroll = window.scrollY);

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const color = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "currentColor";
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = color;
      const lines = 22;
      for (let i = 0; i < lines; i++) {
        const base = (h / lines) * i + ((scroll * 0.15) % (h / lines));
        ctx.globalAlpha = 0.05 + 0.1 * Math.sin((i / lines) * Math.PI);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 8) {
          const nx = x / w;
          const dx = nx - mouse.x;
          const dy = base / h - mouse.y;
          const bump = Math.exp(-(dx * dx + dy * dy) * 9) * 38;
          const y =
            base +
            Math.sin(nx * 6 + t + i * 0.4) * 14 +
            Math.cos(nx * 3.2 - t * 0.7 + i * 0.25) * 10 -
            bump;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      t += 0.004;
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
}
