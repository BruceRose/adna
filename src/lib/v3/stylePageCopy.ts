/**
 * Copy for the /styles overview. STYLES_INTRO is final copy from the v3.1
 * spec (3.4.2); the axis explanations and "How styles work" note were not
 * specified and are written to match the existing style copy.
 */
import type { AxisId } from "./styles";

export const STYLES_INTRO =
  "Everyone has a mix of tendencies. Your style describes where your answers placed you on two axes: how you like to connect with people, and how you like to engage with ideas. Styles next to each other on the grid have a lot in common.";

export const STYLES_AXES: { id: AxisId; name: string; text: string }[] = [
  {
    id: "connecting",
    name: "Connecting",
    text: "How you like to connect with people at events: from Selective (smaller, planned conversations), through Adaptable, to Sociable (busier networking).",
  },
  {
    id: "ideas",
    name: "Ideas",
    text: "How you like to engage with ideas: from Applied (practical, proven content), through Balanced, to Exploratory (future-focused and experimental content).",
  },
];

export const STYLES_HOW_THEY_WORK =
  "A style summarises how someone described themselves on these two axes. Most people sit near the middle on at least one axis, and a style can shift with context, so use it as a starting point for conversation, not a fixed label. Styles describe preferences at events, not abilities.";
