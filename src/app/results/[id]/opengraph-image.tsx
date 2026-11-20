import { ImageResponse } from "next/og";
import { logoDataUri } from "@/components/brand/Logo";
import { getResponse } from "@/lib/responses";
import { CONNECTING_ROWS, GRID, IDEAS_COLUMNS, STYLES } from "@/lib/v3/styles";

/** Share preview: style name, tagline and grid position only. No personal details. */

export const alt = "An Audience DNA event style";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const row = await getResponse((await params).id);
  const style = row ? STYLES[row.style] : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #fff1e8 0%, #fff8f1 45%, #efeaff 100%)",
          color: "#2a2238",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoDataUri()} width={204} height={100} alt="Audience DNA" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 40, color: "#6d6478" }}>My event style</div>
            <div style={{ fontSize: 120, fontWeight: 800, lineHeight: 1.05 }}>{style?.name ?? "Audience DNA"}</div>
            {style && <div style={{ fontSize: 42, color: "#6a4df4", marginTop: 8 }}>{style.tagline}</div>}
          </div>
          <div style={{ fontSize: 30, color: "#6d6478" }}>What&apos;s your event style?</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {CONNECTING_ROWS.map((c) => (
            <div key={c} style={{ display: "flex", gap: 10 }}>
              {IDEAS_COLUMNS.map((i) => {
                const you = row?.style === GRID[c][i];
                return (
                  <div
                    key={i}
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: 20,
                      background: you ? "#6a4df4" : "rgba(106,77,244,0.12)",
                      border: you ? "none" : "2px solid rgba(106,77,244,0.25)",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
