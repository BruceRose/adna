import { ImageResponse } from "next/og";
import { ShareCard } from "@/lib/v3/shareImage";
import { STYLE_IDS, styleFromSlug, styleSlug } from "@/lib/v3/styles";

export const alt = "An Audience DNA event style";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return STYLE_IDS.map((id) => ({ id: styleSlug(id) }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const style = styleFromSlug((await params).id);
  return new ImageResponse(<ShareCard style={style} eyebrow="Event style" />, size);
}
