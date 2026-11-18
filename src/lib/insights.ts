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
/* Audience reports                                                    */
/* ------------------------------------------------------------------ */

/** Audience-level copy, per pole. */
const AUDIENCE_POLE: Record<Pole, { adjective: string; present: string; minorityTip: string }> = {
  extrovert: {
    adjective: "outgoing",
    present: "Get them involved early with polls, a show of hands or a quick chat with their neighbour.",
    minorityTip: "give them chances to talk and interact, not just listen.",
  },
  introvert: {
    adjective: "reflective",
    present: "Give them a moment to think before asking for input, and offer ways to respond that aren't public, like anonymous Q&A.",
    minorityTip: "don't rely only on big-room networking. Offer quieter ways to connect.",
  },
  thinking: {
    adjective: "logic-led",
    present: "Make a logical case, show your sources and welcome probing questions.",
    minorityTip: "make sure there's solid evidence behind the story.",
  },
  feeling: {
    adjective: "people-focused",
    present: "Open with a human story and show how your message affects real people.",
    minorityTip: "make sure there's a human story behind the data.",
  },
  judging: {
    adjective: "organised",
    present: "Start with a clear agenda, signpost where you are and finish on time.",
    minorityTip: "share key timings and logistics clearly, even if the format is loose.",
  },
  perceiving: {
    adjective: "flexible",
    present: "Stay responsive. Be ready to follow the room's energy and questions rather than a rigid script.",
    minorityTip: "leave some room for choice and discovery.",
  },
  sensing: {
    adjective: "practical",
    present: "Use concrete examples, demos and numbers people can picture.",
    minorityTip: "include practical takeaways, not just vision.",
  },
  intuition: {
    adjective: "big-picture",
    present: "Paint the big picture first, then connect the dots to what it means for them.",
    minorityTip: "include some big-picture vision, not just detail.",
  },
};

/** What to do when an audience is evenly split on a pair. */
const MIXED: Record<DimensionKey, { phrase: string; design: string; comms: string; present: string }> = {
  TF: {
    phrase: "a mix of logic-led and people-focused decision-makers",
    design: "Pair evidence with emotion: back every story with data, and give every data point a human angle.",
    comms: "Lead with the why and the people, then back it up with clear facts.",
    present: "Tell a human story, then back it up with evidence.",
  },
  EI: {
    phrase: "a mix of outgoing and reflective people",
    design: "Balance lively networking with small-group and quiet options, so everyone can take part in their own way.",
    comms: "Highlight both the chances to meet people and what they'll learn, and share details in advance.",
    present: "Mix live participation with time to reflect, and offer both open-mic and anonymous ways to respond.",
  },
  JP: {
    phrase: "a mix of planners and go-with-the-flow types",
    design: "Give the day a clear backbone of agenda and timings, with optional extras people can explore.",
    comms: "Share key times and logistics early, but leave some surprises to discover.",
    present: "Signpost clearly, but stay responsive to questions and the energy in the room.",
  },
  SN: {
    phrase: "a mix of practical and big-picture thinkers",
    design: "Combine visionary keynotes with practical case studies and hands-on sessions.",
    comms: "Sell the big idea and back it up with concrete examples.",
    present: "Start with the big picture, then ground it in a real example.",
  },
};

export interface AudienceDimension {
  key: DimensionKey;
  name: string;
  label: string;
  poles: [Pole, Pole];
  /** Share of respondents whose result was each pole (0–100). */
  share: [number, number];
  /** Every respondent's spectrum position (0 = first pole, 100 = second). */
  positions: number[];
  /** Average spectrum position across respondents. */
  avgPosition: number;
  /** "first" / "second" when one side clearly dominates (≥ 60%), otherwise "mixed". */
  lean: "first" | "second" | "mixed";
  /** The dominant pole, if there is one. */
  majority?: Pole;
}

export interface AudienceRecommendation {
  dimension: string;
  heading: string;
  design: string;
  comms: string;
}

export interface PlaybookItem {
  key: DimensionKey;
  text: string;
}

export interface AudienceReport {
  total: number;
  /** True for very small groups, where results are only indicative. */
  smallSample: boolean;
  headline: string;
  dimensions: AudienceDimension[];
  recommendations: AudienceRecommendation[];
  /** The audience's "average" profile: the majority letter on each pair. */
  typicalCode: string;
  /** How many respondents have each profile code. */
  profileCounts: Record<string, number>;
  /** Event formats, ranked by the share of the audience they suit. */
  formats: { name: string; fit: number; key: DimensionKey }[];
  /** Advice by role, strongest-leaning strand first. */
  playbook: { planners: PlaybookItem[]; content: PlaybookItem[]; presenters: PlaybookItem[] };
  /** Things that would drain a large part of the audience. */
  avoid: { text: string; share: number; key: DimensionKey }[];
  /** Significant minorities not to forget. */
  watchOuts: { text: string; share: number; key: DimensionKey }[];
}

export function buildAudienceReport(rows: { scores: PoleScores; version: string }[]): AudienceReport | null {
  if (rows.length === 0) return null;
  const perRow = rows.map((r) => dimensionsFromScores(r.scores, maxNetFor(r.version)));
  const pct = (n: number) => Math.round((n / rows.length) * 100);

  const dimensions: AudienceDimension[] = DIMENSIONS.map((def, i) => {
    const firstShare = pct(perRow.filter((d) => d[i].winner === def.poles[0]).length);
    const positions = perRow.map((d) => d[i].position);
    const lean = firstShare >= 60 ? "first" : firstShare <= 40 ? "second" : "mixed";
    return {
      key: def.key,
      name: def.name,
      label: def.label,
      poles: def.poles,
      share: [firstShare, 100 - firstShare],
      positions,
      avgPosition: Math.round(positions.reduce((a, b) => a + b, 0) / rows.length),
      lean,
      majority: lean === "first" ? def.poles[0] : lean === "second" ? def.poles[1] : undefined,
    };
  });

  const shareOf = (pole: Pole) => {
    const d = dimensions.find((x) => x.poles.includes(pole))!;
    return d.share[d.poles.indexOf(pole)];
  };

  // Strongest consensus first, so the most important advice leads.
  const byConsensus = [...dimensions].sort((a, b) => Math.max(...b.share) - Math.max(...a.share));

  const recommendations = dimensions.map((d): AudienceRecommendation => {
    if (!d.majority) {
      const [a, b] = d.poles;
      return {
        dimension: d.name,
        heading: `A mix of ${POLE_INFO[a].friendly.toLowerCase()} and ${POLE_INFO[b].friendly.toLowerCase()}`,
        design: MIXED[d.key].design,
        comms: MIXED[d.key].comms,
      };
    }
    return {
      dimension: d.name,
      heading: `Mostly ${POLE_INFO[d.majority].friendly.toLowerCase()} (${shareOf(d.majority)}%)`,
      design: POLE_CONTENT[d.majority].organiser.design,
      comms: POLE_CONTENT[d.majority].organiser.comms,
    };
  });

  const playbookFor = (pick: (d: AudienceDimension) => string) => byConsensus.map((d) => ({ key: d.key, text: pick(d) }));
  const playbook = {
    planners: playbookFor((d) => (d.majority ? POLE_CONTENT[d.majority].organiser.design : MIXED[d.key].design)),
    content: playbookFor((d) => (d.majority ? POLE_CONTENT[d.majority].organiser.comms : MIXED[d.key].comms)),
    presenters: playbookFor((d) => (d.majority ? AUDIENCE_POLE[d.majority].present : MIXED[d.key].present)),
  };

  // Formats: every format from every pole, scored by the share of people on that pole.
  const formats = DIMENSIONS.flatMap((def) =>
    def.poles.flatMap((pole) => POLE_CONTENT[pole].formats.map((name) => ({ name, fit: shareOf(pole), key: def.key }))),
  )
    .filter((f) => f.fit > 0)
    .sort((a, b) => b.fit - a.fit || a.name.localeCompare(b.name));

  const avoid = DIMENSIONS.flatMap((def) =>
    def.poles.map((pole) => ({ text: POLE_CONTENT[pole].drains, share: shareOf(pole), key: def.key })),
  )
    .filter((a) => a.share >= 50)
    .sort((a, b) => b.share - a.share);

  const watchOuts = dimensions
    .filter((d) => d.majority)
    .map((d) => {
      const minority = oppositePole(d.majority!);
      const share = shareOf(minority);
      return {
        share,
        key: d.key,
        text: `${share}% are ${AUDIENCE_POLE[minority].adjective}: ${AUDIENCE_POLE[minority].minorityTip}`,
      };
    })
    .filter((w) => w.share >= 20)
    .sort((a, b) => b.share - a.share);

  const profileCounts: Record<string, number> = {};
  for (const d of perRow) {
    const code = d.map((x) => x.letter).join("");
    profileCounts[code] = (profileCounts[code] ?? 0) + 1;
  }

  // Majority letter on each pair; an exact 50/50 split is settled by the average lean.
  const typicalCode = dimensions
    .map((d) => {
      const first = d.share[0] > 50 || (d.share[0] === 50 && d.avgPosition <= 50);
      return POLE_INFO[first ? d.poles[0] : d.poles[1]].letter;
    })
    .join("");

  return {
    total: rows.length,
    smallSample: rows.length < 5,
    headline: headlineFor(byConsensus),
    dimensions,
    recommendations,
    typicalCode,
    profileCounts,
    formats,
    playbook,
    avoid,
    watchOuts,
  };
}

function headlineFor(dims: AudienceDimension[]): string {
  const adjectives = dims.filter((d) => d.majority).map((d) => AUDIENCE_POLE[d.majority!].adjective);
  const mixed = dims.filter((d) => !d.majority).map((d) => MIXED[d.key].phrase);
  const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
  if (adjectives.length === 0) return `A genuinely mixed audience: ${list(mixed)}.`;
  const article = /^[aeiou]/.test(adjectives[0]) ? "An" : "A";
  return `${article} ${adjectives.join(", ")} audience${mixed.length ? `, with ${list(mixed)}` : ""}.`;
}
