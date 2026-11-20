import {
  LOGO_BYLINE_PATHS,
  LOGO_HELIX_PATHS,
  LOGO_VIEWBOX_COMPACT,
  LOGO_VIEWBOX_FULL,
  LOGO_WORD_PATHS,
} from "./logoPaths";

/**
 * The Audience DNA logo, inline so it follows the theme. The original artwork
 * is one flat colour; here the lettering uses --logo-primary and the DNA
 * helix uses --logo-secondary (both defined in globals.css for light and
 * dark mode).
 *
 * `byline` includes "powered by livegroup". It is left off at small sizes,
 * where it would be too small to read.
 */
export function Logo({ byline = false, className }: { byline?: boolean; className?: string }) {
  return (
    <svg
      viewBox={byline ? LOGO_VIEWBOX_FULL : LOGO_VIEWBOX_COMPACT}
      className={`logo-svg${byline ? " with-byline" : ""}${className ? ` ${className}` : ""}`}
      role="img"
      aria-label="Audience DNA"
      focusable="false"
    >
      <title>Audience DNA</title>
      <g fill="var(--logo-primary)">
        {LOGO_WORD_PATHS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g fill="var(--logo-secondary)">
        {LOGO_HELIX_PATHS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      {byline && (
        <g fill="var(--logo-primary)">
          {LOGO_BYLINE_PATHS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      )}
    </svg>
  );
}

/** A self-contained SVG data URI with fixed colours, for share images (Satori needs <img>). */
export function logoDataUri({
  primary = "#2a2238",
  secondary = "#6a4df4",
  byline = true,
}: { primary?: string; secondary?: string; byline?: boolean } = {}): string {
  const group = (fill: string, paths: string[]) => `<g fill="${fill}">${paths.map((d) => `<path d="${d}"/>`).join("")}</g>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${byline ? LOGO_VIEWBOX_FULL : LOGO_VIEWBOX_COMPACT}">` +
    group(primary, LOGO_WORD_PATHS) +
    group(secondary, LOGO_HELIX_PATHS) +
    (byline ? group(primary, LOGO_BYLINE_PATHS) : "") +
    "</svg>";
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
