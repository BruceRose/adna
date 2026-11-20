import { EMBLEM_STROKE, emblemGeometry } from "@/lib/v3/emblem";
import type { StyleId } from "@/lib/v3/styles";

/**
 * A style's emblem (see src/lib/v3/emblem.ts). Decorative: the style name
 * always appears next to it, so colour never carries meaning on its own.
 * `animate` draws the nodes in (600ms), except under reduced motion.
 */
export function StyleEmblem({ style, size = 48, animate = false }: { style: StyleId; size?: number; animate?: boolean }) {
  const g = emblemGeometry(style);
  return (
    <svg
      className={`emblem${animate ? " animate" : ""}`}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      style={{ ["--c" as string]: `var(--style-${style})` }}
    >
      {g.links.map(([x1, y1, x2, y2], i) => (
        <line
          key={`l${i}`}
          className="emblem-link"
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          pathLength={1}
          stroke="var(--c)"
          strokeWidth={EMBLEM_STROKE}
          strokeLinecap="round"
        />
      ))}
      {g.nodes.map((d, i) => (
        <path
          key={`n${i}`}
          className="emblem-node"
          d={d}
          pathLength={1}
          stroke="var(--c)"
          strokeWidth={EMBLEM_STROKE}
          strokeLinejoin="round"
          style={{ animationDelay: animate ? `${120 + i * 60}ms` : undefined }}
        />
      ))}
    </svg>
  );
}
