import { ImageResponse } from "next/og";
import { PROFILES } from "@/lib/questionnaire";
import { getResponse } from "@/lib/responses";

/** Preview card shown when a results link is shared (LinkedIn, Slack, Teams, WhatsApp…). No personal details. */

export const alt = "An Audience DNA profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STRAND = ["#7b5cff", "#ef6a4c", "#e0901f", "#179583"];

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const row = await getResponse((await params).id);
  const profile = PROFILES.find((p) => p.code === row?.code);
  const name = profile?.name ?? "Audience DNA";
  const article = /^[AEIOU]/.test(name) ? "an" : "a";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #fff1e8 0%, #fff8f1 45%, #efeaff 100%)",
          color: "#2a2238",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 34, fontWeight: 700 }}>
          <div style={{ display: "flex", marginRight: 16 }}>
            <div style={{ width: 34, height: 34, borderRadius: 34, background: "#e2563f" }} />
            <div style={{ width: 34, height: 34, borderRadius: 34, background: "#179583", marginLeft: -12 }} />
          </div>
          Audience&nbsp;<span style={{ color: "#6a4df4" }}>DNA</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 40, color: "#6d6478" }}>{profile ? `I'm ${article}` : "Discover yours"}</div>
          <div style={{ fontSize: 132, fontWeight: 800, lineHeight: 1.05 }}>{name}</div>
          {profile && <div style={{ fontSize: 44, color: "#6a4df4", marginTop: 8 }}>{profile.tagline}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex" }}>
            {(profile?.code ?? "????").split("").map((l, i) => (
              <div
                key={i}
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 76,
                  marginRight: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 38,
                  fontWeight: 800,
                  color: "white",
                  background: STRAND[i],
                }}
              >
                {l}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 32, color: "#6d6478" }}>What&apos;s your Audience DNA?</div>
        </div>
      </div>
    ),
    size,
  );
}
