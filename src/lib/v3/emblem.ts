/**
 * Style emblem geometry (v3.1 spec 3.5). Deterministic: drawn from the
 * style's grid position, no image assets.
 *
 * - Connecting sets the nodes: Selective = 1 linked pair, Adaptable = 2
 *   linked pairs, Sociable = a small network of 5 linked nodes. The linked
 *   pair nods to the DNA theme.
 * - Ideas sets the shape: Applied = rounded squares, Balanced = circles,
 *   Exploratory = bursts.
 *
 * Coordinates are in a 100 x 100 viewBox.
 */
import { positionOf, type Level, type StyleId } from "./styles";

export interface EmblemGeometry {
  links: [number, number, number, number][];
  nodes: string[];
}

type Node = [number, number, number]; // x, y, radius

const LAYOUTS: Record<Level, { nodes: Node[]; links: [number, number][] }> = {
  low: {
    nodes: [
      [50, 25, 17],
      [50, 75, 17],
    ],
    links: [[0, 1]],
  },
  mid: {
    nodes: [
      [29, 27, 13],
      [29, 73, 13],
      [71, 27, 13],
      [71, 73, 13],
    ],
    links: [
      [0, 1],
      [2, 3],
      [1, 2],
    ],
  },
  high: {
    nodes: [
      [50, 50, 12],
      [21, 21, 10.5],
      [79, 21, 10.5],
      [21, 79, 10.5],
      [79, 79, 10.5],
    ],
    links: [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [1, 2],
      [3, 4],
    ],
  },
};

const f = (n: number) => Number(n.toFixed(2));

function roundedSquare([x, y, r]: Node): string {
  const s = r * 0.9; // half-width
  const k = r * 0.35; // corner radius
  return [
    `M${f(x - s + k)} ${f(y - s)}`,
    `H${f(x + s - k)}`,
    `Q${f(x + s)} ${f(y - s)} ${f(x + s)} ${f(y - s + k)}`,
    `V${f(y + s - k)}`,
    `Q${f(x + s)} ${f(y + s)} ${f(x + s - k)} ${f(y + s)}`,
    `H${f(x - s + k)}`,
    `Q${f(x - s)} ${f(y + s)} ${f(x - s)} ${f(y + s - k)}`,
    `V${f(y - s + k)}`,
    `Q${f(x - s)} ${f(y - s)} ${f(x - s + k)} ${f(y - s)}`,
    "Z",
  ].join("");
}

function circle([x, y, r]: Node): string {
  return `M${f(x - r)} ${f(y)}A${f(r)} ${f(r)} 0 1 0 ${f(x + r)} ${f(y)}A${f(r)} ${f(r)} 0 1 0 ${f(x - r)} ${f(y)}Z`;
}

function burst([x, y, r]: Node, points = 8): string {
  const inner = r * 0.62;
  const out: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r * 1.08 : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    out.push(`${i === 0 ? "M" : "L"}${f(x + rad * Math.cos(a))} ${f(y + rad * Math.sin(a))}`);
  }
  return out.join("") + "Z";
}

const SHAPES: Record<Level, (n: Node) => string> = { low: roundedSquare, mid: circle, high: burst };

export function emblemGeometry(style: StyleId): EmblemGeometry {
  const { connecting, ideas } = positionOf(style);
  const layout = LAYOUTS[connecting];
  return {
    links: layout.links.map(([a, b]) => [layout.nodes[a][0], layout.nodes[a][1], layout.nodes[b][0], layout.nodes[b][1]]),
    nodes: layout.nodes.map((n) => SHAPES[ideas](n)),
  };
}

export const EMBLEM_STROKE = 5;

/** Stand-alone SVG markup with fixed colours, for share images. */
export function emblemSvg(style: StyleId, colour: string, fill: string): string {
  const g = emblemGeometry(style);
  const links = g.links
    .map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colour}" stroke-width="${EMBLEM_STROKE}" stroke-linecap="round"/>`)
    .join("");
  const nodes = g.nodes
    .map((d) => `<path d="${d}" fill="${fill}" stroke="${colour}" stroke-width="${EMBLEM_STROKE}" stroke-linejoin="round"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${links}${nodes}</svg>`;
}

/** Light-theme style colours (must match --style-{id} in globals.css), for share images. */
export const STYLE_COLOURS_LIGHT: Record<StyleId, string> = {
  activator: "#e0570f",
  pragmatist: "#c2410c",
  analyst: "#9a3412",
  connector: "#8b5cf6",
  all_rounder: "#6d28d9",
  observer: "#5b21b6",
  innovator: "#0d9488",
  explorer: "#0f766e",
  scholar: "#115e59",
};
