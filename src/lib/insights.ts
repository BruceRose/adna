/**
 * Content and logic behind the personal results page and the organiser's
 * audience insights.
 *
 * Copy is written per pole (8 of them) and combined using the respondent's
 * four results, so all 16 profiles get specific, consistent guidance without
 * 16 separate write-ups. Edit the wording here.
 */
import { DIMENSIONS, POLE_INFO, PROFILES, oppositePole, type DimensionKey, type Pole, type Profile } from "./questionnaire";
import type { DimensionResult, PoleScores } from "./scoring";
import { dimensionsFromScores, maxNetFor } from "./scoring";

interface PoleContent {
  /** What this side means for you, in one line. */
  trait: string;
  /** Shown when the respondent sits close to the middle of this pair. */
  flex: string;
  /** How you like to connect with people. */
  connect: string;
  /** Event formats you'll get the most from. */
  formats: string[];
  /** How people should communicate with you. */
  talkToMe: string;
  /** What drains you at events or at work. */
  drains: string;
  /** Recommendations for organisers when an audience leans this way. */
  organiser: { design: string; comms: string };
}

export const POLE_CONTENT: Record<Pole, PoleContent> = {
  extrovert: {
    trait: "You get your energy from people and often think out loud.",
    flex: "You enjoy a buzzing room, but you also value some time to yourself.",
    connect: "You connect by jumping in: introducing yourself, joining groups and keeping conversations moving.",
    formats: ["Networking receptions", "Interactive workshops", "Live Q&A"],
    talkToMe: "Talk it through with me. I'd rather discuss something than read about it.",
    drains: "Long stretches of sitting and listening with no chance to talk or move",
    organiser: {
      design: "Build in plenty of structured networking, interactive sessions and live audience participation.",
      comms: "Make it social: show who else is coming and highlight the chances to meet people.",
    },
  },
  introvert: {
    trait: "You recharge with quiet time and like to think before you speak.",
    flex: "You can work a room when you need to, but you value time to recharge.",
    connect: "You connect best one-to-one or in small groups, where conversations can go deeper.",
    formats: ["Small roundtables", "Pre-booked one-to-one meetings", "Quiet spaces to reflect"],
    talkToMe: "Give me time to think. Send things ahead so I can come prepared.",
    drains: "Packed rooms, forced icebreakers and being put on the spot",
    organiser: {
      design: "Offer small roundtables, pre-booked one-to-ones and a quiet zone. Avoid forced icebreakers and cold-calling the audience.",
      comms: "Share the attendee list and session content in advance so people can plan who to meet.",
    },
  },
  thinking: {
    trait: "You make decisions with logic, evidence and fairness.",
    flex: "You weigh up the facts, but you keep people's feelings in mind too.",
    connect: "You're drawn to conversations with substance: ideas, evidence and real problems to solve.",
    formats: ["Data-led keynotes", "Expert panels"],
    talkToMe: "Get to the point and back it up with evidence.",
    drains: "Vague claims with nothing to back them up",
    organiser: {
      design: "Lead with data, credible experts and clear takeaways. Leave time for challenging questions.",
      comms: "Be concise and specific: what they'll learn, who's speaking, and why it's worth their time.",
    },
  },
  feeling: {
    trait: "You make decisions with people and values in mind.",
    flex: "You care about people, but you can make the tough, logical call too.",
    connect: "You're drawn to conversations that feel genuine, where people share what really matters to them.",
    formats: ["Storytelling sessions", "Purpose-led keynotes"],
    talkToMe: "Show me the human side. Stories and purpose matter to me.",
    drains: "Cold, transactional conversations",
    organiser: {
      design: "Put human stories, purpose and shared values at the centre. Create moments of genuine connection.",
      comms: "Lead with the why and the people. Use stories, faces and testimonials rather than bullet points.",
    },
  },
  judging: {
    trait: "You like a plan, clear goals and getting things finished.",
    flex: "You like to have a plan, but you're comfortable adapting it.",
    connect: "You like conversations with a purpose and a clear next step.",
    formats: ["A clear agenda shared in advance", "Sessions that run to time"],
    talkToMe: "Be clear about timings, next steps and who's doing what.",
    drains: "Last-minute changes and sessions that overrun",
    organiser: {
      design: "Publish a detailed agenda, keep sessions to time and make logistics effortless.",
      comms: "Send clear, early information on times, locations and what to expect. Avoid late changes.",
    },
  },
  perceiving: {
    trait: "You like flexibility, keeping options open and adapting as you go.",
    flex: "You like room to adapt, but you appreciate a plan to work from.",
    connect: "You're happy to see where a conversation goes, and often find the best ones by chance.",
    formats: ["Open 'unconference' sessions", "Drop-in experiences to explore"],
    talkToMe: "Keep it open. Give me options rather than a fixed script.",
    drains: "Rigid schedules with no room to explore",
    organiser: {
      design: "Leave room for discovery: drop-in sessions, open spaces and the freedom to choose their own path.",
      comms: "Tease the highlights rather than every detail, and let people pick and choose.",
    },
  },
  sensing: {
    trait: "You trust practical, real-world detail and what's been proven.",
    flex: "You like practical detail, but you can see the bigger picture too.",
    connect: "You bond over shared experience and practical know-how.",
    formats: ["Case studies", "Hands-on demos"],
    talkToMe: "Show me practical examples and how it works in real life.",
    drains: "Abstract theory with no practical takeaway",
    organiser: {
      design: "Use real case studies, hands-on demos and practical tools people can use the next day.",
      comms: "Be concrete: specific outcomes, real examples and practical details.",
    },
  },
  intuition: {
    trait: "You see the big picture and love exploring future possibilities.",
    flex: "You enjoy big ideas, but you keep an eye on the practical detail.",
    connect: "You light up when talking about ideas, trends and what could happen next.",
    formats: ["Visionary keynotes", "Brainstorms and ideas sessions"],
    talkToMe: "Start with the big idea and where it could lead.",
    drains: "Lots of detail without the bigger purpose",
    organiser: {
      design: "Open with a bold vision, future trends and big questions. Give people space to imagine and co-create.",
      comms: "Sell the big idea and the future it points to, not just the logistics.",
    },
  },
};

export const STRENGTH_LABEL = { slight: "Slight lean", moderate: "Clear lean", strong: "Strong lean" } as const;

const poleOf = (dims: DimensionResult[], key: DimensionKey) => dims.find((d) => d.key === key)!.winner;
const profileByCode = (code: string) => PROFILES.find((p) => p.code === code)!;

export interface Connection {
  profile: Profile;
  /** Short reason, e.g. "Like you, but more Practical". */
  reason: string;
}

export interface PersonalReport {
  profile: Profile;
  dimensions: (DimensionResult & { name: string; line: string })[];
  connect: string[];
  formats: string[];
  talkToMe: string[];
  drains: string[];
  allies: Connection[];
  stretch: Connection;
}

export function buildPersonalReport(code: string, scores: PoleScores, maxNet: number): PersonalReport {
  const profile = profileByCode(code);
  const dims = dimensionsFromScores(scores, maxNet);
  const pole = (k: DimensionKey) => poleOf(dims, k);

  const dimensions = dims.map((d) => {
    const def = DIMENSIONS.find((x) => x.key === d.key)!;
    const c = POLE_CONTENT[d.winner];
    return { ...d, name: def.name, line: d.strength === "slight" ? c.flex : c.trait };
  });

  // Formats: lead with energy style, then one each from the others. Deduplicated, max 5.
  const formats = [
    ...POLE_CONTENT[pole("EI")].formats.slice(0, 2),
    POLE_CONTENT[pole("SN")].formats[0],
    POLE_CONTENT[pole("TF")].formats[0],
    POLE_CONTENT[pole("JP")].formats[0],
  ];

  // Allies differ by one letter: similar enough to click, different enough to be interesting.
  const allies = DIMENSIONS.map((d, i) => {
    const flipped = oppositePole(dims[i].winner);
    const allyCode = code.slice(0, i) + POLE_INFO[flipped].letter + code.slice(i + 1);
    return { profile: profileByCode(allyCode), reason: `Like you, but more ${POLE_INFO[flipped].friendly.toLowerCase()}` };
  });

  const stretchCode = dims.map((d) => POLE_INFO[oppositePole(d.winner)].letter).join("");
  const stretch = {
    profile: profileByCode(stretchCode),
    reason: "Your opposite on all four strands. They'll see what you miss, and you'll see what they miss.",
  };

  return {
    profile,
    dimensions,
    connect: [POLE_CONTENT[pole("EI")].connect, POLE_CONTENT[pole("TF")].connect, POLE_CONTENT[pole("JP")].connect],
    formats: [...new Set(formats)],
    talkToMe: (["TF", "SN", "EI", "JP"] as DimensionKey[]).map((k) => POLE_CONTENT[pole(k)].talkToMe),
    drains: (["EI", "JP", "SN"] as DimensionKey[]).map((k) => POLE_CONTENT[pole(k)].drains),
    allies,
    stretch,
  };
}

/* ------------------------------------------------------------------ */
/* Audience insights for organisers                                    */
/* ------------------------------------------------------------------ */

export interface AudienceDimension {
  key: DimensionKey;
  name: string;
  label: string;
  poles: [Pole, Pole];
  /** Share of respondents whose result was each pole (0–100). */
  share: [number, number];
  /** Average spectrum position across respondents (0 = first pole, 100 = second). */
  avgPosition: number;
  /** "first" / "second" when one side clearly dominates (≥ 60%), otherwise "mixed". */
  lean: "first" | "second" | "mixed";
}

export interface AudienceRecommendation {
  dimension: string;
  heading: string;
  design: string;
  comms: string;
}

export interface AudienceReport {
  total: number;
  dimensions: AudienceDimension[];
  recommendations: AudienceRecommendation[];
  /** The audience's "average" profile: the majority letter on each pair. */
  typicalCode: string;
}

export function buildAudienceReport(
  rows: { scores: PoleScores; version: string }[],
): AudienceReport | null {
  if (rows.length === 0) return null;
  const perRow = rows.map((r) => dimensionsFromScores(r.scores, maxNetFor(r.version)));

  const dimensions: AudienceDimension[] = DIMENSIONS.map((def, i) => {
    const firstCount = perRow.filter((d) => d[i].winner === def.poles[0]).length;
    const firstShare = Math.round((firstCount / rows.length) * 100);
    const avgPosition = Math.round(perRow.reduce((sum, d) => sum + d[i].position, 0) / rows.length);
    return {
      key: def.key,
      name: def.name,
      label: def.label,
      poles: def.poles,
      share: [firstShare, 100 - firstShare],
      avgPosition,
      lean: firstShare >= 60 ? "first" : firstShare <= 40 ? "second" : "mixed",
    };
  });

  const recommendations = dimensions.map((d): AudienceRecommendation => {
    const [a, b] = d.poles;
    if (d.lean === "mixed") {
      return {
        dimension: d.name,
        heading: `A mix of ${POLE_INFO[a].friendly.toLowerCase()} and ${POLE_INFO[b].friendly.toLowerCase()}`,
        design: `Cater for both. ${POLE_CONTENT[a].organiser.design} At the same time: ${lowerFirst(POLE_CONTENT[b].organiser.design)}`,
        comms: `${POLE_CONTENT[a].organiser.comms} ${POLE_CONTENT[b].organiser.comms}`,
      };
    }
    const pole = d.lean === "first" ? a : b;
    const share = d.lean === "first" ? d.share[0] : d.share[1];
    return {
      dimension: d.name,
      heading: `Mostly ${POLE_INFO[pole].friendly.toLowerCase()} (${share}%)`,
      design: POLE_CONTENT[pole].organiser.design,
      comms: POLE_CONTENT[pole].organiser.comms,
    };
  });

  const typicalCode = dimensions.map((d) => POLE_INFO[d.share[0] >= 50 ? d.poles[0] : d.poles[1]].letter).join("");
  return { total: rows.length, dimensions, recommendations, typicalCode };
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
