"use client";

import { useId } from "react";

interface HexPatternProps {
  /** Circumradius of each hexagon in pixels. Smaller = denser grid. */
  size?: number;
  /** Stroke opacity (0-1). */
  opacity?: number;
  /** Stroke color. Accepts any CSS color string. */
  stroke?: string;
  className?: string;
}

/**
 * Full-coverage SVG hexagonal grid pattern.
 * Place inside a `relative overflow-hidden` container.
 */
export function HexPattern({
  size = 24,
  opacity = 0.1,
  stroke = "var(--color-white)",
  className,
}: HexPatternProps): React.ReactElement {
  const id = useId();
  const R = size;
  const dx = (R * Math.sqrt(3)) / 2; // horizontal half-step
  const W = dx * 4; // tile width  (2 columns)
  const H = R * 3; // tile height (2 rows)

  const pts = (cx: number, cy: number): string => {
    const vertices: [number, number][] = [
      [cx + dx, cy - R / 2],
      [cx + dx, cy + R / 2],
      [cx, cy + R],
      [cx - dx, cy + R / 2],
      [cx - dx, cy - R / 2],
      [cx, cy - R],
    ];
    return vertices.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  };

  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={id} width={W.toFixed(2)} height={H.toFixed(2)} patternUnits="userSpaceOnUse">
          {/* Row 1: two full hexagons */}
          <polygon
            points={pts(dx, R)}
            fill="none"
            stroke={stroke}
            strokeWidth="0.8"
            opacity={opacity}
          />
          <polygon
            points={pts(3 * dx, R)}
            fill="none"
            stroke={stroke}
            strokeWidth="0.8"
            opacity={opacity}
          />
          {/* Row 2: three offset hexagons (edge halves complete via tiling) */}
          <polygon
            points={pts(0, 2.5 * R)}
            fill="none"
            stroke={stroke}
            strokeWidth="0.8"
            opacity={opacity}
          />
          <polygon
            points={pts(2 * dx, 2.5 * R)}
            fill="none"
            stroke={stroke}
            strokeWidth="0.8"
            opacity={opacity}
          />
          <polygon
            points={pts(W, 2.5 * R)}
            fill="none"
            stroke={stroke}
            strokeWidth="0.8"
            opacity={opacity}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
