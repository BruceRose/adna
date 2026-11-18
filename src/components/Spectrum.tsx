import { POLE_INFO } from "@/lib/questionnaire";
import { STRENGTH_LABEL, type PersonalReport } from "@/lib/insights";

/** One row per pair: a spectrum with a marker showing where the respondent sits. */
export function Spectrum({ dimensions }: { dimensions: PersonalReport["dimensions"] }) {
  return (
    <ul className="strands">
      {dimensions.map((d) => {
        const [a, b] = d.scores.map((s) => s.pole);
        const toRight = d.position >= 50;
        const fillLeft = toRight ? 50 : d.position;
        const fillWidth = Math.abs(d.position - 50);
        return (
          <li key={d.key} className="strand-row" style={{ ["--c" as string]: `var(--strand-${d.key})` }}>
            <div className="strand-head">
              <h3>{d.name}</h3>
              <span className="strand-result">
                {d.percent}% {POLE_INFO[d.winner].friendly} · <span>{STRENGTH_LABEL[d.strength]}</span>
              </span>
            </div>
            <div className="spectrum" role="img" aria-label={`${d.percent}% ${POLE_INFO[d.winner].friendly}`}>
              <div className="spectrum-fill" style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }} />
              <div className="spectrum-mid" />
              <div className="spectrum-dot" style={{ left: `${d.position}%` }} />
            </div>
            <div className="spectrum-ends">
              <span className={d.winner === a ? "win" : ""}>
                {POLE_INFO[a].friendly} <small>{POLE_INFO[a].label}</small>
              </span>
              <span className={d.winner === b ? "win" : ""}>
                <small>{POLE_INFO[b].label}</small> {POLE_INFO[b].friendly}
              </span>
            </div>
            <p className="strand-line">{d.line}</p>
          </li>
        );
      })}
    </ul>
  );
}
