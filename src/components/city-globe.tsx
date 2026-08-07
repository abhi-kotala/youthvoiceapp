import { useEffect, useRef, useState } from "react";
import { LANDMASSES } from "@/lib/world-landmasses";


export type GlobeCity = {
  name: string;
  lat: number;
  lon: number;
  /** 0..1 relative activity — drives point size + pulse */
  intensity: number;
  live: boolean;
};

type Props = {
  cities: GlobeCity[];
  selected: string | null;
  onSelect: (name: string) => void;
  className?: string;
};

type Vec3 = { x: number; y: number; z: number };

function toVec(lat: number, lon: number): Vec3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return {
    x: -Math.sin(phi) * Math.cos(theta),
    y: Math.cos(phi),
    z: Math.sin(phi) * Math.sin(theta),
  };
}

function rotate(v: Vec3, rx: number, ry: number): Vec3 {
  // yaw
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const x1 = v.x * cy - v.z * sy;
  const z1 = v.x * sy + v.z * cy;
  // pitch
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const y2 = v.y * cx - z1 * sx;
  const z2 = v.y * sx + z1 * cx;
  return { x: x1, y: y2, z: z2 };
}

export function CityGlobe({ cities, selected, onSelect, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    rx: -0.38,
    ry: -0.2,
    spin: true,
    dragging: false,
    lastX: 0,
    lastY: 0,
    hits: [] as { name: string; sx: number; sy: number }[],
  });
  const [hover, setHover] = useState<string | null>(null);
  const dataRef = useRef({ cities, selected, hover });
  dataRef.current = { cities, selected, hover };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let last = 0;
    const draw = (t: number) => {
      const s = stateRef.current;
      const { cities: cs, selected: sel, hover: hv } = dataRef.current;
      const dt = last ? Math.min(64, t - last) : 16;
      last = t;
      if (s.spin && !s.dragging) {
        s.ry += 0.00014 * dt;
        if (s.ry > Math.PI * 2) s.ry -= Math.PI * 2;
      }

      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.38;

      ctx.clearRect(0, 0, w, h);

      // outer atmosphere
      const atmo = ctx.createRadialGradient(cx, cy, R * 0.75, cx, cy, R * 1.5);
      atmo.addColorStop(0, "rgba(34,211,238,0.20)");
      atmo.addColorStop(0.5, "rgba(129,90,255,0.10)");
      atmo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = atmo;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // ocean body
      const body = ctx.createRadialGradient(
        cx - R * 0.35,
        cy - R * 0.4,
        R * 0.1,
        cx,
        cy,
        R,
      );
      body.addColorStop(0, "rgba(28,86,146,0.98)");
      body.addColorStop(0.55, "rgba(12,48,94,0.98)");
      body.addColorStop(0.85, "rgba(6,25,56,0.98)");
      body.addColorStop(1, "rgba(3,12,30,0.99)");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      const project = (v: Vec3) => ({
        sx: cx + v.x * R,
        sy: cy - v.y * R,
        z: v.z,
      });

      // continents (clipped to the sphere, only front-facing spans)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      const land = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
      land.addColorStop(0, "rgba(72,163,131,0.92)");
      land.addColorStop(0.6, "rgba(44,122,105,0.9)");
      land.addColorStop(1, "rgba(28,84,82,0.9)");

      for (const ring of LANDMASSES) {
        // densify long edges so shapes bend with the sphere
        const pts: { sx: number; sy: number; z: number }[] = [];
        for (let i = 0; i < ring.length; i++) {
          const [lon1, lat1] = ring[i]!;
          const [lon2, lat2] = ring[(i + 1) % ring.length]!;
          const steps = Math.max(
            1,
            Math.ceil(Math.max(Math.abs(lon2 - lon1), Math.abs(lat2 - lat1)) / 4),
          );
          for (let st = 0; st < steps; st++) {
            const f = st / steps;
            const lat = lat1 + (lat2 - lat1) * f;
            const lon = lon1 + (lon2 - lon1) * f;
            pts.push(project(rotate(toVec(lat, lon), s.rx, s.ry)));
          }
        }

        // skip fully back-facing shapes
        if (!pts.some((p) => p.z >= 0)) continue;

        // clamp back-facing vertices onto the limb so the outline stays a
        // single continuous polygon instead of flickering broken subpaths
        ctx.beginPath();
        pts.forEach((p, i) => {
          let { sx, sy } = p;
          if (p.z < 0) {
            const dx = sx - cx;
            const dy = sy - cy;
            const d = Math.hypot(dx, dy) || 1;
            sx = cx + (dx / d) * R;
            sy = cy + (dy / d) * R;
          }
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.closePath();
        ctx.fillStyle = land;
        ctx.fill();
        ctx.strokeStyle = "rgba(150,235,205,0.35)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      ctx.restore();

      // graticule
      ctx.lineWidth = 1;
      for (let latD = -60; latD <= 60; latD += 30) {
        ctx.beginPath();
        let started = false;
        for (let lonD = -180; lonD <= 180; lonD += 4) {
          const p = project(rotate(toVec(latD, lonD), s.rx, s.ry));
          if (p.z < 0) {
            started = false;
            continue;
          }
          if (!started) {
            ctx.moveTo(p.sx, p.sy);
            started = true;
          } else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle = "rgba(180,230,255,0.10)";
        ctx.stroke();
      }
      for (let lonD = -180; lonD < 180; lonD += 30) {
        ctx.beginPath();
        let started = false;
        for (let latD = -90; latD <= 90; latD += 4) {
          const p = project(rotate(toVec(latD, lonD), s.rx, s.ry));
          if (p.z < 0) {
            started = false;
            continue;
          }
          if (!started) {
            ctx.moveTo(p.sx, p.sy);
            started = true;
          } else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle = "rgba(180,230,255,0.08)";
        ctx.stroke();
      }

      // day/night terminator shading
      const shade = ctx.createRadialGradient(
        cx - R * 0.45,
        cy - R * 0.45,
        R * 0.15,
        cx,
        cy,
        R * 1.05,
      );
      shade.addColorStop(0, "rgba(255,255,255,0.10)");
      shade.addColorStop(0.45, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(0,6,20,0.6)");
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // rim light
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(125,215,255,0.5)";
      ctx.lineWidth = 1.4;
      ctx.stroke();


      // city points
      const hits: { name: string; sx: number; sy: number }[] = [];
      const pulse = (Math.sin(t / 620) + 1) / 2;

      const projected = cs
        .map((c) => ({ c, p: project(rotate(toVec(c.lat, c.lon), s.rx, s.ry)) }))
        .sort((a, b) => a.p.z - b.p.z);

      for (const { c, p } of projected) {
        if (p.z < -0.05) continue;
        const front = Math.max(0, Math.min(1, (p.z + 0.05) / 0.5));
        const base = 2.6 + c.intensity * 4.5;
        const isActive = sel === c.name || hv === c.name;
        const color = c.live ? "103,232,249" : "167,139,250";

        // halo
        const halo = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, base * 5);
        halo.addColorStop(0, `rgba(${color},${0.5 * front})`);
        halo.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, base * 5, 0, Math.PI * 2);
        ctx.fill();

        // pulse ring
        if (c.live) {
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, base + pulse * base * 2.4, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${color},${(0.5 - pulse * 0.45) * front})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // core
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, base * (isActive ? 1.4 : 1), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.55 + 0.45 * front})`;
        ctx.fill();

        if (p.z > 0.05) hits.push({ name: c.name, sx: p.sx, sy: p.sy });

        // label
        if (p.z > 0.15 && (isActive || !c.live)) {
          ctx.font = `600 11px ui-sans-serif, system-ui`;
          ctx.fillStyle = `rgba(226,247,255,${isActive ? 0.98 : 0.6 * front})`;
          ctx.fillText(c.name, p.sx + base * 2, p.sy - base);
        }
      }
      s.hits = hits;

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const pick = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let best: string | null = null;
      let bestD = 22;
      for (const hit of stateRef.current.hits) {
        const d = Math.hypot(hit.sx - x, hit.sy - y);
        if (d < bestD) {
          bestD = d;
          best = hit.name;
        }
      }
      return best;
    };

    const onDown = (e: PointerEvent) => {
      const s = stateRef.current;
      s.dragging = true;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const s = stateRef.current;
      if (s.dragging) {
        s.ry += (e.clientX - s.lastX) * 0.006;
        s.rx = Math.max(-1.2, Math.min(1.2, s.rx - (e.clientY - s.lastY) * 0.006));
        s.lastX = e.clientX;
        s.lastY = e.clientY;
        return;
      }
      const name = pick(e);
      setHover(name);
      canvas.style.cursor = name ? "pointer" : "grab";
    };
    const onUp = (e: PointerEvent) => {
      const s = stateRef.current;
      const moved = Math.hypot(e.clientX - s.lastX, e.clientY - s.lastY);
      s.dragging = false;
      if (moved < 4) {
        const name = pick(e);
        if (name) onSelect(name);
      }
    };
    const onLeave = () => {
      stateRef.current.dragging = false;
      setHover(null);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [onSelect]);

  return (
    <div ref={wrapRef} className={className}>
      <canvas ref={canvasRef} className="h-full w-full touch-none select-none" />
      <span className="sr-only">
        Interactive globe of cities participating in YouthVoice. Use the city buttons below to
        select a city.
      </span>
    </div>
  );
}
