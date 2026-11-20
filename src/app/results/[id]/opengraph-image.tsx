import { ImageResponse } from "next/og";
import { getResponse } from "@/lib/responses";
import { ShareCard } from "@/lib/v3/shareImage";

/** Share preview: style name, tagline, emblem and grid position only. No personal details. */

export const alt = "An Audience DNA event style";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const row = await getResponse((await params).id);
  return new ImageResponse(<ShareCard style={row?.style ?? null} eyebrow="My event style" />, size);
}
