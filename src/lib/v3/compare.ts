/**
 * "Compared with you" on style pages (v3.1 spec 3.4.2). Describes
 * differences only: never compatibility, chemistry or whether people will
 * get on. Pure.
 */
import { AXIS_NAMES, LEVEL_NAMES, STYLES, positionOf, stylePlural, type AxisId, type Level, type StyleId } from "./styles";

const IMPLICATIONS: Record<AxisId, Record<Level, string>> = {
  connecting: {
    high: "they're likely to enjoy busier networking",
    mid: "they're comfortable with a mix of busy and quiet settings",
    low: "they're likely to prefer smaller, planned conversations",
  },
  ideas: {
    high: "they're drawn to future-focused and experimental content",
    mid: "they like a mix of big ideas and practical detail",
    low: "they prefer practical, proven content",
  },
};

export interface Comparison {
  /** One line per axis. */
  lines: string[];
  /** "Tip: ..." using the other style's connect line. */
  tip: string;
}

export function compareStyles(you: StyleId, them: StyleId): Comparison {
  const a = positionOf(you);
  const b = positionOf(them);
  const lines = (["connecting", "ideas"] as AxisId[]).map((axis) => {
    const axisName = AXIS_NAMES[axis];
    if (a[axis] === b[axis]) return `You're both ${LEVEL_NAMES[axis][a[axis]]} on ${axisName}.`;
    return `${stylePlural(them)} are more ${LEVEL_NAMES[axis][b[axis]]} than you on ${axisName}: ${IMPLICATIONS[axis][b[axis]]}.`;
  });
  return { lines, tip: `Tip: ${STYLES[them].connect}` };
}
