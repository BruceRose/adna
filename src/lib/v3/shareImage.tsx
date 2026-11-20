/**
 * Shared layout for 1200 x 630 share images (style pages and results).
 * Satori needs inline styles and <img> data URIs for SVGs.
 */
import { logoDataUri } from "@/components/brand/Logo";
import { SITE_HOST } from "../site";
import { STYLE_COLOURS_LIGHT, emblemSvg } from "./emblem";
import { CONNECTING_ROWS, GRID, IDEAS_COLUMNS, STYLES, type StyleId } from "./styles";

const svgUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

export function ShareCard({ style, eyebrow }: { style: StyleId | null; eyebrow: string }) {
  const s = style ? STYLES[style] : null;
  const colour = style ? STYLE_COLOURS_LIGHT[style] : "#6a4df4";
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "space-between",
        padding: 64,
        background: "linear-gradient(135deg, #fff1e8 0%, #fff8f1 45%, #efeaff 100%)",
        color: "#2a2238",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 720 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoDataUri()} width={204} height={100} alt="Audience DNA" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 38, color: "#6d6478" }}>{eyebrow}</div>
          <div style={{ fontSize: 112, fontWeight: 800, lineHeight: 1.05 }}>{s?.name ?? "Audience DNA"}</div>
          {s && <div style={{ fontSize: 40, color: colour, marginTop: 8 }}>{s.tagline}</div>}
        </div>
        <div style={{ fontSize: 28, color: "#6d6478" }}>{`Discover your event style at ${SITE_HOST}`}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36 }}>
        {style && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={svgUri(emblemSvg(style, colour, "#ffffff"))} width={240} height={240} alt="" />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {CONNECTING_ROWS.map((c) => (
            <div key={c} style={{ display: "flex", gap: 8 }}>
              {IDEAS_COLUMNS.map((i) => {
                const on = style === GRID[c][i];
                return (
                  <div
                    key={i}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: on ? colour : "rgba(106,77,244,0.10)",
                      border: on ? "none" : "2px solid rgba(106,77,244,0.22)",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
