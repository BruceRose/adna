import type { Share } from "@/lib/v3/audience";
import {
  CONNECTING_ROWS,
  GRID,
  IDEAS_COLUMNS,
  LEVEL_NAMES,
  STYLES,
  type Level,
  type StyleId,
} from "@/lib/v3/styles";

/**
 * The 3 x 3 style map: Connecting (rows, high at the top) by Ideas (columns,
 * applied on the left). Personal mode highlights one cell and outlines the
 * neighbour; audience mode shades cells by share and shows totals.
 */
export function StyleGrid(
  props:
    | { mode: "personal"; style: StyleId; neighbour: StyleId | null }
    | {
        mode: "audience";
        cells: Record<StyleId, Share>;
        rowTotals: Record<Level, Share>;
        colTotals: Record<Level, Share>;
        n: number;
      },
) {
  const audience = props.mode === "audience" ? props : null;
  const max = audience ? Math.max(1, ...Object.values(audience.cells).map((c) => c.n)) : 1;

  return (
    <div className={`sgrid${audience ? " with-totals" : ""}`}>
      <div className="sgrid-yaxis" aria-hidden>
        <span>Connecting</span>
      </div>
      <div className="sgrid-body">
        <div className="sgrid-table" role="table" aria-label="Style map: Connecting by Ideas">
          {CONNECTING_ROWS.map((c) => (
            <div key={c} className="sgrid-row" role="row">
              <div className="sgrid-rowhead" role="rowheader">
                {LEVEL_NAMES.connecting[c]}
              </div>
              {IDEAS_COLUMNS.map((i) => {
                const id = GRID[c][i];
                const style = STYLES[id];
                if (audience) {
                  const cell = audience.cells[id];
                  const intensity = cell.n === 0 ? 0 : 14 + Math.round((cell.n / max) * 76);
                  return (
                    <div
                      key={id}
                      role="cell"
                      className={`sgrid-cell heat${cell.n === 0 ? " empty" : ""}${intensity > 55 ? " dark" : ""}`}
                      style={{ ["--i" as string]: `${intensity}%` }}
                    >
                      <span className="sgrid-name">{style.name}</span>
                      <span className="sgrid-count">
                        <strong>{cell.n}</strong> <span>{cell.pct}%</span>
                      </span>
                    </div>
                  );
                }
                const personal = props as { style: StyleId; neighbour: StyleId | null };
                const you = personal.style === id;
                const near = personal.neighbour === id;
                return (
                  <div key={id} role="cell" className={`sgrid-cell${you ? " you" : ""}${near ? " near" : ""}`}>
                    <span className="sgrid-name">{style.name}</span>
                    {you && <span className="sgrid-tag">You</span>}
                    {near && <span className="sgrid-tag">A touch of</span>}
                  </div>
                );
              })}
              {audience && (
                <div className="sgrid-total" role="cell">
                  {audience.rowTotals[c].pct}%
                </div>
              )}
            </div>
          ))}
          <div className="sgrid-row sgrid-foot" role="row">
            <div className="sgrid-rowhead" aria-hidden />
            {IDEAS_COLUMNS.map((i) => (
              <div key={i} className="sgrid-colhead" role="columnheader">
                {LEVEL_NAMES.ideas[i]}
                {audience && <span className="sgrid-coltotal">{audience.colTotals[i].pct}%</span>}
              </div>
            ))}
            {audience && <div className="sgrid-total muted">n = {audience.n}</div>}
          </div>
        </div>
        <div className="sgrid-xaxis" aria-hidden>
          Ideas
        </div>
      </div>
    </div>
  );
}
