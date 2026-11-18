import { POLE_INFO } from "@/lib/questionnaire";
import type { DimensionResult } from "@/lib/scoring";

/** One split bar per dimension, showing both poles' points and the winner. */
export function DimensionBars({ dimensions }: { dimensions: DimensionResult[] }) {
  return (
    <ul className="dims">
      {dimensions.map((d) => {
        const [a, b] = d.scores;
        const total = a.score + b.score || 1;
        const aPct = (a.score / total) * 100;
        return (
          <li key={d.key} className="dim">
            <div className="dim-labels">
              <span className={d.winner === a.pole ? "win" : ""}>
                {POLE_INFO[a.pole].label} <b>{a.score}</b>
              </span>
              <span className={d.winner === b.pole ? "win" : ""}>
                <b>{b.score}</b> {POLE_INFO[b.pole].label}
              </span>
            </div>
            <div
              className="dim-bar"
              role="img"
              aria-label={`${POLE_INFO[a.pole].label} ${a.score} points, ${POLE_INFO[b.pole].label} ${b.score} points`}
            >
              <div className={`dim-a${d.winner === a.pole ? " win" : ""}`} style={{ width: `${aPct}%` }} />
              <div className={`dim-b${d.winner === b.pole ? " win" : ""}`} style={{ width: `${100 - aPct}%` }} />
            </div>
            {d.tied && <p className="dim-note">Evenly balanced, counted as {POLE_INFO[d.winner].label}</p>}
          </li>
        );
      })}
    </ul>
  );
}
