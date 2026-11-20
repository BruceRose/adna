"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { compareStyles } from "@/lib/v3/compare";
import {
  CONNECTING_ROWS,
  GRID,
  IDEAS_COLUMNS,
  LEVEL_NAMES,
  STYLES,
  isStyleId,
  styleSlug,
  stylePlural,
  type StyleId,
} from "@/lib/v3/styles";
import { StyleEmblem } from "./StyleEmblem";

/** The respondent's own style from ?you= (style id only, never a response id). */
export function useYou(): StyleId | null {
  const you = useSearchParams().get("you");
  return isStyleId(you) ? you : null;
}

export const styleHref = (id: StyleId, you: StyleId | null) => `/styles/${styleSlug(id)}${you ? `?you=${you}` : ""}`;

/**
 * 3 x 3 grid of the nine styles, each linking to its page. Arrow keys move
 * between cells. `you` marks the respondent's cell and is carried in links.
 */
export function StyleExplorerGrid({
  you = null,
  current,
  compact = false,
}: {
  you?: StyleId | null;
  current?: StyleId;
  compact?: boolean;
}) {
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 };
    if (!(e.key in moves)) return;
    const row = Math.floor(index / 3);
    let next = index + moves[e.key];
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") next = row * 3 + ((index % 3) + 3 + moves[e.key]) % 3;
    if (next < 0 || next > 8) return;
    e.preventDefault();
    refs.current[next]?.focus();
  }

  return (
    <div className={`xgrid${compact ? " compact" : ""}`}>
      <div className="xgrid-yaxis" aria-hidden>
        <span>Connecting</span>
      </div>
      <div>
        <ul className="xgrid-cells" aria-label="The nine event styles">
          {CONNECTING_ROWS.map((c, r) =>
            IDEAS_COLUMNS.map((i, k) => {
              const id = GRID[c][i];
              const index = r * 3 + k;
              const isYou = you === id;
              return (
                <li key={id}>
                  <Link
                    ref={(el) => {
                      refs.current[index] = el;
                    }}
                    href={styleHref(id, you)}
                    className={`xcell${isYou ? " you" : ""}${current === id ? " current" : ""}`}
                    aria-current={current === id ? "page" : undefined}
                    onKeyDown={(e) => onKeyDown(e, index)}
                  >
                    <StyleEmblem style={id} size={compact ? 36 : 48} />
                    <span className="xcell-name">{STYLES[id].name}</span>
                    {!compact && <span className="xcell-tag">{STYLES[id].tagline}</span>}
                    {isYou && <span className="xcell-you">You</span>}
                    <span className="sr-only">
                      {" "}
                      ({LEVEL_NAMES.connecting[c]}, {LEVEL_NAMES.ideas[i]})
                    </span>
                  </Link>
                </li>
              );
            }),
          )}
        </ul>
        <div className="xgrid-cols" aria-hidden>
          {IDEAS_COLUMNS.map((i) => (
            <span key={i}>{LEVEL_NAMES.ideas[i]}</span>
          ))}
        </div>
        <div className="xgrid-xaxis" aria-hidden>
          Ideas
        </div>
      </div>
      <div className="xgrid-rows" aria-hidden>
        {CONNECTING_ROWS.map((c) => (
          <span key={c}>{LEVEL_NAMES.connecting[c]}</span>
        ))}
      </div>
    </div>
  );
}

/** The grid with "You" taken from ?you= (wrap in <Suspense> on static pages). */
export function StyleExplorerGridFromUrl(props: { current?: StyleId; compact?: boolean }) {
  return <StyleExplorerGrid {...props} you={useYou()} />;
}

/** "Compared with you" (or "This is your style") on a style page. */
export function YouPanel({ them }: { them: StyleId }) {
  const you = useYou();
  if (!you) return null;
  if (you === them) {
    return (
      <section className="card you-panel">
        <h2 className="section-title">This is your style</h2>
      </section>
    );
  }
  const cmp = compareStyles(you, them);
  return (
    <section className="card you-panel">
      <h2 className="section-title">Compared with you</h2>
      <p className="muted small">
        You&apos;re {/^[AEIOU]/.test(STYLES[you].name) ? "an" : "a"} {STYLES[you].name}.
      </p>
      <ul className="ticks">
        {cmp.lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <p className="callout">{cmp.tip}</p>
    </section>
  );
}

/** "{p}% of people who have taken AudienceDNA are {Name}s", shown only once there are 100+ responses. */
export function HowCommon({ style }: { style: StyleId }) {
  const [pct, setPct] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/style-stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { total: number; counts: Record<StyleId, number> } | null) => {
        if (live && d && d.total >= 100) setPct(Math.round((d.counts[style] / d.total) * 100));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [style]);
  if (pct === null) return null;
  return (
    <section className="card how-common">
      <h2 className="section-title">How common</h2>
      <p>
        {pct}% of people who have taken AudienceDNA are {stylePlural(style)}.
      </p>
    </section>
  );
}

/** Footer call to action: discover your style, or go back to your results. */
export function StyleFooterCta() {
  const you = useYou();
  if (!you) {
    return (
      <Link href="/" className="button primary-cta">
        Discover your style
      </Link>
    );
  }
  return (
    <div className="cta-row">
      <button type="button" className="primary" onClick={() => history.back()}>
        Back to my results
      </button>
      <Link href="/" className="small">
        Take the questionnaire again
      </Link>
    </div>
  );
}
