import { NORMS, sem } from "@/lib/norms";
import { LEVEL_NAMES, type AxisId } from "@/lib/v3/styles";

const SCALE_LABELS: Record<AxisId, [string, string]> = {
  connecting: ["Social energy", "Social initiative"],
  ideas: ["Depth", "Openness to new things"],
};

/** Position on a 1-5 scale as a percentage of the track. */
const pos = (v: number) => ((Math.min(5, Math.max(1, v)) - 1) / 4) * 100;

/**
 * Where a respondent sits on one axis: a marker, a band of +/- 1 SEM, faint
 * ticks at the cut points and level labels. No numbers are shown to
 * respondents. Below: the two contributing scales as small bars.
 */
export function Continuum({
  axis,
  score,
  scales,
}: {
  axis: AxisId;
  score: number;
  /** The two contributing scale scores (1-5), e.g. [SE, SI]. */
  scales: [number, number];
}) {
  const { cuts } = NORMS[axis];
  const s = sem(NORMS[axis]);
  const lo = pos(score - s);
  const hi = pos(score + s);
  const zones = [
    { label: LEVEL_NAMES[axis].low, at: pos((1 + cuts[0]) / 2) },
    { label: LEVEL_NAMES[axis].mid, at: pos((cuts[0] + cuts[1]) / 2) },
    { label: LEVEL_NAMES[axis].high, at: pos((cuts[1] + 5) / 2) },
  ];
  const name = axis === "connecting" ? "Connecting" : "Ideas";

  return (
    <div className={`continuum axis-${axis}`}>
      <h3>{name}</h3>
      <div className="cont-track" role="img" aria-label={`${name}: you sit in the ${zoneFor(score, cuts, axis)} range`}>
        <div className="cont-band" style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
        {cuts.map((c) => (
          <div key={c} className="cont-cut" style={{ left: `${pos(c)}%` }} />
        ))}
        {/* The layer spans the track, so translating it by a % of its width slides the marker from the centre. */}
        <div className="cont-marker-layer" style={{ ["--shift" as string]: `${(50 - pos(score)).toFixed(2)}%` }}>
          <div className="cont-marker" style={{ left: `${pos(score)}%` }} />
        </div>
      </div>
      <div className="cont-zones" aria-hidden>
        {zones.map((z) => (
          <span key={z.label} style={{ left: `${z.at}%` }}>
            {z.label}
          </span>
        ))}
      </div>
      <div className="cont-scales">
        {SCALE_LABELS[axis].map((label, i) => (
          <div key={label} className="cont-scale">
            <span className="muted small">{label}</span>
            <span className="cont-scale-bar" aria-hidden>
              <span style={{ width: `${pos(scales[i])}%` }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function zoneFor(score: number, cuts: readonly [number, number], axis: AxisId) {
  const level = score < cuts[0] ? "low" : score > cuts[1] ? "high" : "mid";
  return LEVEL_NAMES[axis][level];
}
