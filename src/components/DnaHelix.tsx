import { DIMENSIONS } from "@/lib/questionnaire";
import type { DimensionResult } from "@/lib/scoring";

/**
 * A double helix drawn from the respondent's results. Each of the four
 * sections is one pair of traits, in that pair's colour, and the helix is
 * taller where the lean is stronger. The twist is seeded from the code, so
 * different profiles look different.
 */
export function DnaHelix({
  dimensions,
  code,
  label,
}: {
  dimensions: Pick<DimensionResult, "key" | "letter" | "percent">[];
  code: string;
  label?: string;
}) {
  const W = 640;
  const H = 150;
  const mid = H / 2;
  const seg = W / dimensions.length;
  const period = seg * 0.75;
  const phase = [...code].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 7;

  // Amplitude per section from lean strength, blended smoothly between sections.
  const amps = dimensions.map((d) => 16 + ((d.percent - 50) / 50) * 44);
  const ampAt = (x: number) => {
    const t = x / seg - 0.5;
    const i = Math.max(0, Math.min(amps.length - 1, Math.floor(t)));
    const j = Math.min(amps.length - 1, i + 1);
    const f = Math.max(0, Math.min(1, t - i));
    const s = (1 - Math.cos(f * Math.PI)) / 2;
    return amps[i] * (1 - s) + amps[j] * s;
  };
  const yAt = (x: number, sign: 1 | -1) => mid + sign * ampAt(x) * Math.sin((2 * Math.PI * x) / period + phase);

  const strand = (sign: 1 | -1) => {
    let d = "";
    for (let x = 0; x <= W; x += 4) d += `${x === 0 ? "M" : "L"}${x},${yAt(x, sign).toFixed(1)}`;
    return d;
  };

  const rungs: { x: number; y1: number; y2: number; key: string; depth: number }[] = [];
  for (let x = 8; x < W; x += 13) {
    const i = Math.min(dimensions.length - 1, Math.floor(x / seg));
    const depth = Math.abs(Math.cos((2 * Math.PI * x) / period + phase));
    rungs.push({ x, y1: yAt(x, 1), y2: yAt(x, -1), key: dimensions[i].key, depth });
  }

  return (
    <figure className="helix">
      <svg viewBox={`-6 0 ${W + 12} ${H + 32}`} role="img" aria-label={label ?? `Your DNA strand for ${code}`}>
        <defs>
          <linearGradient id="strand-grad" x1="0" x2="1" y1="0" y2="0">
            {DIMENSIONS.map((d, i) => (
              <stop key={d.key} offset={`${(i + 0.5) / DIMENSIONS.length}`} style={{ stopColor: `var(--strand-${d.key})` }} />
            ))}
          </linearGradient>
        </defs>
        {rungs.map((r, i) => (
          <g key={i} className="rung" style={{ animationDelay: `${0.3 + i * 0.015}s` }}>
            <line
              x1={r.x}
              x2={r.x}
              y1={r.y1}
              y2={r.y2}
              stroke={`var(--strand-${r.key})`}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.25 + 0.55 * r.depth}
            />
            <circle cx={r.x} cy={r.y1} r={3.2} fill={`var(--strand-${r.key})`} />
            <circle cx={r.x} cy={r.y2} r={3.2} fill={`var(--strand-${r.key})`} opacity={0.6} />
          </g>
        ))}
        <path className="strand" d={strand(1)} pathLength={1} fill="none" stroke="url(#strand-grad)" strokeWidth={4} strokeLinecap="round" />
        <path
          className="strand strand-2"
          d={strand(-1)}
          pathLength={1}
          fill="none"
          stroke="url(#strand-grad)"
          strokeWidth={4}
          strokeLinecap="round"
          opacity={0.55}
        />
        {dimensions.map((d, i) => (
          <text key={d.key} x={seg * i + seg / 2} y={H + 24} textAnchor="middle" className="helix-letter" fill={`var(--strand-${d.key})`}>
            {d.letter}
          </text>
        ))}
      </svg>
    </figure>
  );
}
