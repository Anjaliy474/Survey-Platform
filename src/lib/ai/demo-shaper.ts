/**
 * DEMO stand-in for the question_shaper stage (combined.system.txt).
 *
 * Until the Claude connection is added, this rules-and-templates engine returns output in the
 * exact question_shaper JSON schema, so the Studio is built against the real contract. It
 * covers the golden-set situations from Activity 3: fixing leading and double-barrelled
 * questions (H2), thin briefs (E1), too many questions for the time limit (E3), requests to
 * rig the results (A1) and instructions hidden in pasted text. It is not language
 * understanding: unusual briefs fall back to a general template with [placeholders].
 */
import { isOpenEnded, secondsFor } from "@/lib/player/rules";
import type { Question } from "@/lib/player/types";
import { looksDuplicate, parsePastedQuestions } from "./parse";
import type { ShapedQuestion, ShaperOutput, SurveyRequest } from "./types";

const DEFAULT_CAP = 10;
const MAX_QUESTIONS = 15;

/* ---------------- scales and bands ---------------- */

const scale5 = (labels: string[]) => ({ points: 5, min_label: labels[0], max_label: labels[4], point_labels: labels });
const SATISFIED = scale5(["Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied"]);
const AGREE = scale5(["Strongly disagree", "Disagree", "Neither agree nor disagree", "Agree", "Strongly agree"]);
const LIKELY = scale5(["Very unlikely", "Unlikely", "Not sure", "Likely", "Very likely"]);
const RATE = scale5(["Very poor", "Poor", "Fair", "Good", "Very good"]);
const CLEAR = scale5(["Very unclear", "Unclear", "Neither clear nor unclear", "Clear", "Very clear"]);
const FREQUENCY = scale5(["Never", "Rarely", "Sometimes", "Often", "Always"]);
const PACE = scale5(["Much too slow", "A bit slow", "About right", "A bit fast", "Much too fast"]);
const NPS = { points: 11, min_label: "Not at all likely", max_label: "Extremely likely" };
const AGE_BANDS = ["Under 18", "18–24", "25–34", "35–44", "45–54", "55 or older", "Prefer not to say"];
const PRICE_BANDS = ["Would not pay", "Under ₹100 a month", "₹100–₹299 a month", "₹300–₹499 a month", "₹500 or more a month"];

/* ---------------- detectors ---------------- */

const INJECTION = /\b(ignore|disregard|forget)\b[^.\n]{0,40}\b(instructions?|rules|prompt)\b|\byou are now\b|\bsystem prompt\b/i;
const BIAS_REQUEST =
  /\b(prove|proves|show|shows|demonstrate)s?\b[^.\n]{0,60}\b(love|loves|like|likes|prefer|happy|satisfied)\b|\bonly positive\b|\bpositive (options|answers) only\b|\blook good\b|\binvestor (deck|pitch)\b/i;
const PERSONAL = /\b(full name|your name|phone|mobile number|e-?mail|address|roll (no|number)|employee id|aadhaar|whatsapp number)\b/i;
const WELLBEING = /\b(mental health|stress|anxiety|depress\w*|wellbeing|well-being|wellness|burn ?out|lonely|loneliness|sleep)\b/i;

type Topic = "wellbeing" | "workplace" | "event" | "pricing" | "demand" | "learning" | "customer" | "general";
const TOPICS: [Topic, RegExp][] = [
  ["wellbeing", WELLBEING],
  ["workplace", /\b(employees?|staff|workload|manager|workplace|office|engagement|team pulse|hr)\b/i],
  ["event", /\b(fest|festival|event|workshop|drive|hackathon|session|webinar|conference|meetup|seminar|tournament|trip|volunteers?|camp)\b/i],
  ["pricing", /\b(new pricing|pricing|price change|new price|price rise|price increase)\b/i],
  ["demand", /\b(would\b.*\b(pay|use|buy|switch|try)|app|startup|subscription|launch|idea|product|service|booking|pricing|price)\b/i],
  ["learning", /\b(course|class|classes|lecture|teaching|curriculum|tutorial|learning|syllabus)\b/i],
  ["customer", /\b(caf(?:e|é)|restaurant|canteen|shop|store|customers?|outlet|hotel|salon|clinic|menu|visit)(?![a-z])/i],
];

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const trimQ = (s: string) => s.replace(/[?.!\s]+$/, "");
/** Questions end with "?"; instructions such as "Rate your visit" end with ".". */
const punctuate = (s: string) =>
  /^(how|what|which|why|when|where|who|whose|do|does|did|is|are|was|were|have|has|had|will|would|can|could|should)\b/i.test(s) ? `${s}?` : `${s}.`;

function detectTopic(text: string): Topic {
  return TOPICS.find(([, re]) => re.test(text))?.[0] ?? "general";
}

/** Pull the subject out of a one-liner ("Feedback for our college fest" → "the college fest"). */
function subjectOf(text: string): string | null {
  const t = trimQ(text);
  const patterns = [
    /\bwould\s+.+?\s+(?:pay|use|buy|switch to|try)\s+(?:for\s+)?(.+)$/i,
    /\b(?:feedback|survey|poll|questionnaire|satisfaction|review)\b.*?\b(?:for|on|about|after|of)\s+(.+)$/i,
    /\b(?:for|about|on|after)\s+(.+)$/i,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m?.[1]) {
      const s = m[1].replace(/^(our|my|your)\s+/i, "the ").trim();
      if (words(s) <= 7) return s;
    }
  }
  return null;
}

/* ---------------- question builder ---------------- */

let counter = 0;
function q(text: string, type: Question["type"], extra: Partial<ShapedQuestion> & { reason: string }): ShapedQuestion {
  counter += 1;
  const open = type === "short_text" || type === "long_text";
  return {
    id: `Q${counter}`,
    text,
    type,
    options: type === "yes_no" ? ["Yes", "No"] : [],
    scale: null,
    required: !open,
    sensitive: false,
    collects_personal_data: false,
    role: "attitude",
    maps_to_decision: "",
    change: { action: "new", source_id: "", before: "", why: "" },
    ...extra,
  };
}

const renumber = (qs: ShapedQuestion[]) => qs.map((x, i) => ({ ...x, id: `Q${i + 1}` }));

/** Open questions go last (rules: at most two, last, optional). */
function openLast(qs: ShapedQuestion[]): ShapedQuestion[] {
  return [...qs.filter((x) => !isOpenEnded(x)), ...qs.filter((x) => isOpenEnded(x))];
}

/* ---------------- templates (describe_research and quick_prompt) ---------------- */

type Template = { decision: string; purpose: string; questions: ShapedQuestion[]; notes?: string[]; sensitive?: boolean };

function template(topic: Topic, subject: string | null, brief = ""): Template {
  const timing = brief.match(/\b(sundays?|saturdays?|weekends?)\b/i);
  const S = (fallback: string) => subject ?? fallback;
  switch (topic) {
    case "event": {
      const ev = S("[event name]");
      return {
        decision: `What to keep and what to change before the next ${ev.replace(/^the /, "")}`,
        purpose: "plan the next one better",
        questions: [
          q(`Was this your first time at ${ev}?`, "yes_no", { role: "behaviour", reason: "Separates first-timers from regulars, whose views often differ." }),
          q(`Overall, how satisfied were you with ${ev}?`, "rating_scale", { scale: SATISFIED, role: "outcome", reason: "The headline result to track from one event to the next." }),
          q("How clear was the information you got before and during the day?", "rating_scale", { scale: CLEAR, reason: "Unclear information is one of the easiest things to fix." }),
          q("What did you enjoy most?", "multi_choice", {
            options: ["The main activity", "Meeting people", "Food and refreshments", "How it was organised", "None of these"],
            max_choices: 2,
            reason: "Shows what to keep, without asking people to rank everything.",
          }),
          q(`How likely are you to come to the next one?`, "rating_scale", { scale: LIKELY, role: "intention", reason: "A forward-looking measure of whether it was worth their time." }),
          q("How did you hear about it?", "single_choice", {
            options: ["WhatsApp", "Instagram", "A friend", "Posters or notices", "Other"],
            role: "behaviour",
            reason: "Tells you which channels to use next time.",
          }),
          q("What is one thing we should change next time?", "long_text", { reason: "Catches ideas the closed questions can't." }),
        ],
      };
    }
    case "demand": {
      const thing = S("[your product]");
      return {
        decision: `Whether people would use ${thing}, and at what price`,
        purpose: "understand whether this would be useful to you",
        questions: [
          q("How do you handle this today?", "single_choice", {
            options: ["I do it myself", "I use another service", "Someone else does it for me", "I don't need this", "Other"],
            role: "behaviour",
            reason: "Behaviour first: what people do today comes before what they say they'd do.",
          }),
          q("How often do you need this?", "single_choice", {
            options: ["Every day", "A few times a week", "About once a week", "Less often", "Never"],
            role: "behaviour",
            reason: "Frequency tells you how big the need really is.",
          }),
          q("What is the hardest part of how you do it now?", "single_choice", {
            options: ["It takes too long", "It costs too much", "It's unreliable", "Nothing, it works fine", "Other"],
            reason: "Includes 'it works fine' so the question doesn't assume a problem.",
          }),
          q(`How likely would you be to try ${thing} if it were available?`, "rating_scale", {
            scale: LIKELY,
            role: "intention",
            reason: "Stated intention; read it alongside today's behaviour, not on its own.",
          }),
          q("What would you consider a fair price?", "number_band", {
            options: PRICE_BANDS,
            role: "intention",
            reason: "Bands are easier to answer than an exact figure, and 'Would not pay' keeps it honest.",
          }),
          q("How would you prefer to use it?", "single_choice", {
            options: ["WhatsApp", "A mobile app", "A website", "No preference"],
            role: "behaviour",
            reason: "Informs where to build first.",
          }),
          q("Anything else we should know?", "long_text", { reason: "Room for needs the options missed." }),
        ],
      };
    }
    case "pricing":
      return {
        decision: "How customers see the new pricing, and whether they'll stay",
        purpose: "understand how the new pricing works for you",
        questions: [
          q("Compared with before the price change, how is the value you get now?", "rating_scale", {
            scale: scale5(["Much worse", "A bit worse", "About the same", "A bit better", "Much better"]),
            role: "attitude",
            reason: "Balanced on both sides, so people can say if it got worse.",
          }),
          q("How likely are you to continue at the new price?", "rating_scale", {
            scale: LIKELY,
            role: "intention",
            reason: "The outcome the pricing decision depends on.",
          }),
          q("Which plan are you on?", "single_choice", {
            options: ["[Plan 1]", "[Plan 2]", "[Plan 3]", "Not sure"],
            role: "behaviour",
            reason: "Lets you compare answers by plan. Replace the placeholders with your plan names.",
          }),
          q("What, if anything, would make the new pricing work better for you?", "long_text", { reason: "Room for reasons the scales can't capture." }),
        ],
      };
    case "workplace":
      return {
        decision: "Where the team needs support, reported only for groups of 10 or more",
        purpose: "understand where the team needs support",
        sensitive: true,
        notes: [
          "Report results only for groups of 10 or more people, so no one can be identified.",
          "Consider a validated engagement instrument if you plan to compare over time.",
        ],
        questions: [
          q("My workload is manageable.", "rating_scale", { scale: AGREE, required: false, sensitive: true, reason: "Workload is the most common pressure point." }),
          q("I'm clear about what my priorities are.", "rating_scale", { scale: AGREE, required: false, sensitive: true, reason: "Unclear priorities often sit behind workload problems." }),
          q("I get the support I need from my manager.", "rating_scale", { scale: AGREE, required: false, sensitive: true, reason: "Support is something leadership can act on directly." }),
          q("I feel my work is recognised.", "rating_scale", { scale: AGREE, required: false, sensitive: true, reason: "Recognition is a strong driver of whether people stay." }),
          q("How likely are you to recommend this team as a place to work?", "nps_0_10", { scale: NPS, required: false, role: "outcome", sensitive: true, reason: "One headline number to track between pulses." }),
          q("What would help you most right now?", "long_text", { sensitive: true, reason: "Lets people raise what the statements missed." }),
        ],
      };
    case "learning": {
      const course = S("[course name]");
      return {
        decision: `What to change in ${course}`,
        purpose: "improve the course",
        questions: [
          q("How many hours a week do you spend on it outside class?", "number_band", {
            options: ["Less than 1", "1–2", "3–5", "6–10", "More than 10"],
            role: "behaviour",
            reason: "Effort context for the other answers.",
          }),
          q("How do you find the pace?", "rating_scale", { scale: PACE, reason: "A balanced scale with 'about right' in the middle." }),
          q("How clear are the explanations?", "rating_scale", { scale: CLEAR, reason: "Clarity is the most fixable part of teaching." }),
          q("How useful are the materials?", "rating_scale", { scale: RATE, reason: "Shows whether the materials are worth improving." }),
          q("What would help you most?", "multi_choice", {
            options: ["More examples", "More practice questions", "Recorded sessions", "More time for doubts", "Nothing more"],
            max_choices: 2,
            reason: "Turns opinions into concrete options.",
          }),
          q("Anything else about the course?", "long_text", { reason: "Room for what the options missed." }),
        ],
      };
    }
    case "customer": {
      const place = S("[business name]");
      const day = timing?.[1]?.toLowerCase().replace(/s$/, "");
      const when = day ? day.charAt(0).toUpperCase() + day.slice(1) : undefined;
      const timingQs = when
        ? [
            q("Which days do you usually visit?", "multi_choice", {
              options: ["Weekdays", "Saturday", "Sunday", "It varies", "I haven't visited yet"],
              role: "behaviour",
              reason: "What people do today comes before what they say they'd do.",
            }),
            q(`If we were open on ${when}s, how likely would you be to visit then?`, "rating_scale", {
              scale: LIKELY,
              role: "intention",
              reason: `Directly informs the decision about ${when}s; read it alongside today's habits.`,
            }),
          ]
        : [];
      return {
        decision: `What to improve at ${place}`,
        purpose: when ? `decide whether to open on ${when}s` : "improve your next visit",
        questions: [
          ...timingQs,
          q("How often do you visit?", "single_choice", {
            options: ["This was my first visit", "A few times a year", "About once a month", "Every week", "More than once a week"],
            role: "behaviour",
            reason: "Regulars and first-timers notice different things.",
          }),
          q("Overall, how satisfied were you with your visit?", "rating_scale", { scale: SATISFIED, role: "outcome", reason: "The headline result to track over time." }),
          q("How would you rate the quality?", "rating_scale", { scale: RATE, reason: "Separates quality from the overall experience." }),
          q("How would you rate the value for money?", "rating_scale", { scale: RATE, reason: "Price perception often explains low satisfaction." }),
          q("How likely are you to recommend us to a friend or colleague?", "nps_0_10", { scale: NPS, role: "outcome", reason: "A standard measure you can compare with others." }),
          q("What should we improve first?", "single_choice", {
            options: ["Speed of service", "Quality", "Prices", "Choice", "Nothing in particular"],
            reason: "Includes 'Nothing in particular' so it doesn't assume a problem.",
          }),
          q("Anything else you'd like to tell us?", "long_text", { reason: "Room for what the options missed." }),
        ],
      };
    }
    case "wellbeing":
      return {
        decision: "What support students would actually use",
        purpose: "understand what support would help",
        sensitive: true,
        notes: [
          "Use a validated scale (for example one your counselling centre recommends) if you need to measure wellbeing, and ask an expert to review the questions.",
          "Keep it anonymous: no names, roll numbers or room numbers.",
        ],
        questions: [
          q("In the past two weeks, how often have you felt stressed about your studies?", "rating_scale", {
            scale: FREQUENCY,
            required: false,
            sensitive: true,
            role: "behaviour",
            reason: "Asks about frequency of experience, never a diagnosis.",
          }),
          q("In the past two weeks, how often have you had trouble sleeping?", "rating_scale", {
            scale: FREQUENCY,
            required: false,
            sensitive: true,
            role: "behaviour",
            reason: "A concrete, everyday experience people can answer honestly.",
          }),
          q("Which kinds of support would you be likely to use?", "multi_choice", {
            options: ["Talking to a counsellor", "Peer support groups", "Workshops on managing stress", "Online resources", "None of these"],
            required: false,
            sensitive: true,
            role: "intention",
            reason: "Directly informs what support to offer.",
          }),
          q("Is there anything that would make it easier to ask for help?", "long_text", {
            sensitive: true,
            reason: "Optional, and placed last. If you need support now, contact [counselling centre contact].",
          }),
        ],
      };
    default: {
      const topic = S("[topic]");
      return {
        decision: `How people feel about ${topic}, and what to change`,
        purpose: "learn what to improve",
        questions: [
          q(`How familiar are you with ${topic}?`, "single_choice", {
            options: ["Not familiar", "A little familiar", "Quite familiar", "Very familiar"],
            role: "behaviour",
            reason: "Puts the other answers in context.",
          }),
          q(`Overall, how satisfied are you with ${topic}?`, "rating_scale", { scale: SATISFIED, role: "outcome", reason: "A headline measure you can track." }),
          q("What works well?", "multi_choice", {
            options: ["[Option 1]", "[Option 2]", "[Option 3]", "None of these"],
            max_choices: 2,
            reason: "Replace the placeholders with the parts you want feedback on.",
          }),
          q("How likely are you to recommend it to a friend?", "rating_scale", { scale: LIKELY, role: "intention", reason: "A simple forward-looking measure." }),
          q("What is one thing that should change?", "long_text", { reason: "Room for what the options missed." }),
        ],
      };
    }
  }
}

/** Keep within the time limit: cut from the end (closed questions first), never silently. */
function fitTime(qs: ShapedQuestion[], limit: number | null) {
  const cut: ShaperOutput["cut_questions"] = [];
  const kept = [...qs];
  while (limit !== null && kept.length > 1 && secondsFor(kept) > limit) {
    const closedIdx = kept.map((x, i) => (isOpenEnded(x) ? -1 : i)).filter((i) => i >= 0);
    const removeAt = closedIdx.length > 2 ? closedIdx[closedIdx.length - 1] : kept.length - 1;
    const [gone] = kept.splice(removeAt, 1);
    cut.push({ source_id: gone.id, text: gone.text, reason: "Keeps the survey within your time limit.", suggested_home: "later_pulse" });
  }
  return { kept, cut };
}

/* ---------------- bring_questions: improve without overreaching ---------------- */

const LEADING_AGREE = /^(?:don'?t|do not|wouldn'?t|would not|isn'?t|aren'?t|wasn'?t)\s+you\s+(?:agree|think|feel)\s+(?:that\s+)?(.+)$/i;
const LEADING_ADJ = /^how\s+(amazing|great|awesome|wonderful|fantastic|excellent|good|bad|terrible|poor)\s+(?:was|is|were|are)\s+(.+)$/i;
const TWO_THINGS = /^(.*?\b(?:with|about|of)\s+)(the\s+)?([\w\s'-]+?)\s+and\s+(the\s+)?([\w\s'-]+)$/i;
const RATING_WORDS = /\b(satisf\w*|rate|rating|happy|how good|quality)\b/i;
const YES_NO_START = /^(do|does|did|is|are|was|were|have|has|had|will|would|can|could|should)\b/i;
const OPEN_START = /^(why|what|how could|how can|describe|tell us|anything|any (other )?(comments|suggestions)|suggest)/i;

function inferType(text: string, options: string[]): Pick<ShapedQuestion, "type" | "options" | "scale" | "max_choices"> {
  if (options.length === 2 && options.every((o) => /^(yes|no)$/i.test(o))) return { type: "yes_no", options: ["Yes", "No"], scale: null };
  if (options.length > 0) {
    const multi = /\b(select|pick|choose|tick)\b.*\b(all|any|up to)\b/i.test(text);
    const limit = text.match(/\bup to (\d+)/i);
    return { type: multi ? "multi_choice" : "single_choice", options, scale: null, ...(limit ? { max_choices: Number(limit[1]) } : {}) };
  }
  if (/\brecommend\b/i.test(text) && /\blikely\b/i.test(text)) return { type: "nps_0_10", options: [], scale: NPS };
  if (/\bsatisf/i.test(text)) return { type: "rating_scale", options: [], scale: SATISFIED };
  if (/\blikely\b/i.test(text)) return { type: "rating_scale", options: [], scale: LIKELY };
  if (YES_NO_START.test(text) && !/\bor\b/i.test(text)) return { type: "yes_no", options: ["Yes", "No"], scale: null };
  if (OPEN_START.test(text)) return { type: "long_text", options: [], scale: null };
  return { type: "short_text", options: [], scale: null };
}

function roleFor(text: string): ShapedQuestion["role"] {
  if (/\b(age|gender|year of study|department|role|city)\b/i.test(text)) return "demographic";
  if (/\b(how often|how many|hours|did you|do you use|which)\b/i.test(text)) return "behaviour";
  if (/\b(would you|will you|likely|plan to)\b/i.test(text)) return "intention";
  if (/\b(satisf|recommend|overall)\b/i.test(text)) return "outcome";
  return "attitude";
}

function improve(p: { id: string; text: string; options: string[] }): ShapedQuestion[] {
  const text = trimQ(p.text);
  const base = (t: string, extra: Partial<ShapedQuestion>): ShapedQuestion => {
    const personal = PERSONAL.test(t);
    const merged: ShapedQuestion = {
      id: p.id,
      text: punctuate(t),
      ...inferType(t, p.options),
      required: true,
      sensitive: false,
      collects_personal_data: personal,
      role: roleFor(t),
      reason: "",
      maps_to_decision: "",
      change: { action: "kept", source_id: p.id, before: "", why: "" },
      ...extra,
    };
    // Required depends on the final type: open questions and personal data are always optional.
    const open = merged.type === "short_text" || merged.type === "long_text";
    return { ...merged, required: extra.required ?? (!open && !personal) };
  };

  let m = text.match(LEADING_AGREE);
  if (m) {
    return [
      base(`How much do you agree or disagree that ${trimQ(m[1])}`, {
        type: "rating_scale",
        options: [],
        scale: AGREE,
        reason: "Measures agreement without signalling the answer you hope for.",
        change: { action: "rewritten", source_id: p.id, before: p.text, why: "“Don't you agree” pushes people toward one answer. A neutral question with a balanced scale gets honest answers." },
      }),
    ];
  }
  m = text.match(LEADING_ADJ);
  if (m) {
    return [
      base(`How would you rate ${trimQ(m[2])}`, {
        type: "rating_scale",
        options: [],
        scale: RATE,
        reason: "Asks for a rating instead of assuming one.",
        change: { action: "rewritten", source_id: p.id, before: p.text, why: `“${m[1]}” suggests the answer you hope for. Asking for a rating lets people say what they actually think.` },
      }),
    ];
  }
  m = text.match(TWO_THINGS);
  if (m && RATING_WORDS.test(text) && p.options.length === 0) {
    const [, prefix, the1 = "", a, the2 = "", b] = m;
    const scale = /satisf/i.test(text) ? SATISFIED : RATE;
    const mk = (t: string, n: number): ShapedQuestion =>
      base(t, {
        id: `${p.id}${n === 0 ? "a" : "b"}`,
        type: "rating_scale",
        options: [],
        scale,
        reason: "One topic per question, so each answer is clear.",
        change: { action: "split", source_id: p.id, before: p.text, why: "This asked about two things at once, so one answer couldn't tell you which one people meant." },
      });
    return [mk(`${prefix}${the1}${a.trim()}`, 0), mk(`${prefix}${the2}${b.trim()}`, 1)];
  }
  if (/\b(age|how old)\b/i.test(text) && p.options.length === 0) {
    return [
      base("Which age group are you in", {
        type: "number_band",
        options: AGE_BANDS,
        scale: null,
        required: true,
        role: "demographic",
        reason: "Age bands are quicker to answer and easier to compare.",
        change: { action: "converted", source_id: p.id, before: p.text, why: "Exact ages aren't needed. Bands are quicker, and 'Prefer not to say' keeps it comfortable." },
      }),
    ];
  }
  if (/^(please\s+)?rate\b/i.test(text) && p.options.length === 0) {
    return [
      base(text, {
        type: "rating_scale",
        options: [],
        scale: RATE,
        reason: "A labelled scale means everyone reads the points the same way.",
        change: { action: "converted", source_id: p.id, before: p.text, why: "A rating needs a labelled scale; without one, people guess what the numbers mean." },
      }),
    ];
  }
  return [
    base(text, {
      reason: PERSONAL.test(text) ? "Personal data: kept optional, with its purpose in the consent line." : "Clear as written, so we left it alone.",
    }),
  ];
}

/* ---------------- main ---------------- */

export function demoShape(req: SurveyRequest): ShaperOutput {
  counter = 0;
  const input = req.input.trim();
  const ctx = req.context;
  const flags: string[] = [];
  const notes: string[] = [];
  const assumptions: string[] = [];
  let status: ShaperOutput["status"] = "ready";
  let cut: ShaperOutput["cut_questions"] = [];
  let questions: ShapedQuestion[] = [];
  let decisions: string[] = [];
  let summary = "";
  let conflict = "";
  const declined = { request: "", reason: "" };
  const clarifying: string[] = [];
  let purpose = "learn what you think";

  const injected = input.split(/\r?\n/).filter((l) => INJECTION.test(l));
  if (injected.length) flags.push(`We ignored an instruction inside your text (“${injected[0].trim().slice(0, 80)}”). It was treated as text, not a command.`);
  const cleanInput = input
    .split(/\r?\n/)
    .filter((l) => !INJECTION.test(l))
    .join("\n");

  if (req.mode === "bring_questions") {
    const parsed = parsePastedQuestions(cleanInput);
    const seen: { id: string; text: string }[] = [];
    for (const p of parsed) {
      const dup = seen.find((s) => looksDuplicate(s.text, p.text));
      if (dup) {
        const [kept] = improve(p);
        questions.push({
          ...kept,
          reason: "Kept for you to decide.",
          change: { action: "flagged_duplicate", source_id: p.id, before: p.text, why: `Looks like a repeat of ${dup.id}. Merge them or keep both.` },
        });
        continue;
      }
      seen.push({ id: p.id, text: p.text });
      questions.push(...improve(p));
    }
    const movedOpen = questions.some((x, i) => isOpenEnded(x) && questions.slice(i + 1).some((y) => !isOpenEnded(y)));
    questions = openLast(questions);
    if (movedOpen) notes.push("We moved open questions to the end. Easy questions first keeps more people going.");
    decisions = ctx.decision.trim()
      ? [ctx.decision.trim()]
      : ["Not given: tell us the decision this survey should inform, and we can check every question supports it."];
    purpose = "learn what you think";

    const limit = ctx.time_limit_seconds;
    const tooMany = questions.length > MAX_QUESTIONS;
    const tooLong = limit !== null && secondsFor(questions) > limit;
    if (tooMany || tooLong) {
      status = "conflict";
      conflict = tooMany
        ? "You brought more questions than fit one survey. Long surveys lose people, so we suggest a core set and list the rest below."
        : "These questions take longer than your time limit. We suggest a core set that fits, and list the rest below.";
      const capCount = Math.min(DEFAULT_CAP, questions.length);
      let core = questions.slice(0, capCount);
      const rest = questions.slice(capCount);
      const fit = fitTime(core, limit);
      core = fit.kept;
      cut = [
        ...fit.cut,
        ...rest.map((x) => ({ source_id: x.change.source_id || x.id, text: x.text, reason: "Beyond the core set; fits better as an optional section or a later pulse.", suggested_home: "optional_section" as const })),
      ];
      questions = core;
    }
    const changed = questions.filter((x) => x.change.action !== "kept").length;
    summary = changed
      ? "We fixed wording that could push an answer, split questions that asked two things, and kept the rest as you wrote them. Review each change before moving on."
      : "Your questions read clearly, so we kept them as written. Check the bias review and the length before moving on.";
  } else {
    const brief = `${cleanInput} ${ctx.known}`;
    const topic = detectTopic(brief);
    const rigged = BIAS_REQUEST.test(cleanInput);
    const subject = req.mode === "quick_prompt" && !rigged ? subjectOf(cleanInput.split(/[.\n]/)[0] ?? "") : null;
    const t = template(topic, subject, brief);
    questions = t.questions;
    purpose = t.purpose;
    decisions = req.mode === "describe_research" && cleanInput ? [trimQ(cleanInput.split(/(?<=[.?!])\s/)[0]).slice(0, 160)] : [t.decision];
    notes.push(...(t.notes ?? []));
    if (!subject) assumptions.push("We couldn't tell exactly what the survey is about, so names and details are left as [placeholders] for you to fill.");
    const KIND: Record<Topic, string> = {
      event: "an event feedback",
      demand: "a demand-check",
      pricing: "a pricing feedback",
      workplace: "a workplace pulse",
      learning: "a course feedback",
      customer: "a customer feedback",
      wellbeing: "a student wellbeing",
      general: "a general feedback",
    };
    if (req.mode === "quick_prompt") assumptions.push(`We read this as ${KIND[topic]} survey.`);
    assumptions.push(ctx.audience ? `People answering: ${ctx.audience}.` : "We assumed the people answering are the ones the brief is about.");

    if (rigged) {
      status = "declined_with_alternative";
      declined.request = cleanInput.slice(0, 160);
      declined.reason = "A survey designed to prove one answer can't tell you what people really think, so we wrote a neutral version instead.";
      notes.push("When you share results, report how many people answered and the exact wording of each question.");
    } else if (topic === "wellbeing" || (req.mode === "describe_research" && (words(cleanInput) < 7 || !ctx.audience))) {
      status = "needs_clarification";
      if (req.mode === "describe_research" && words(cleanInput) < 7) clarifying.push("What decision will this survey help you make?");
      if (!ctx.audience) clarifying.push("Who will answer it?");
      if (topic === "wellbeing") clarifying.push("Should it be fully anonymous?");
    }

    if (ctx.sensitive || t.sensitive) {
      questions = questions.map((x) => ({ ...x, required: false, sensitive: true }));
      notes.push("Sensitive topic: every question is optional and answers stay anonymous.");
    }
    if (!ctx.anonymous) {
      questions.push(
        q("Your email, if you're happy for us to follow up", "short_text", {
          collects_personal_data: true,
          input_kind: "email",
          role: "demographic",
          reason: "You asked for contact details; it stays optional and tied to one purpose.",
        }),
      );
    }
    const fit = fitTime(openLast(questions), ctx.time_limit_seconds);
    questions = fit.kept;
    cut = fit.cut;
    summary =
      req.mode === "quick_prompt"
        ? "Here's a full first draft. We filled in what we could and marked every guess as a [placeholder]. Check the assumptions."
        : "These questions follow your decision: behaviour first, then opinions and intentions, with open questions last.";
  }

  questions = renumber(questions).map((x) => ({ ...x, maps_to_decision: decisions[0] ?? "" }));
  const personal = questions.some((x) => x.collects_personal_data);
  const sensitive = questions.some((x) => x.sensitive);
  const consent = personal
    ? "Personal details are optional and used only for the purpose stated in the question. You can ask us to delete them at any time."
    : sensitive
      ? "This survey is anonymous. Every question is optional, and you can stop at any time."
      : "";

  return {
    mode: req.mode,
    status,
    summary_for_creator: summary,
    decisions_informed: decisions,
    assumptions,
    clarifying_questions: clarifying.slice(0, 3),
    conflict_explanation: conflict,
    declined,
    purpose_line: `[organisation name] is running this short survey to ${purpose}. Answers are only shown as group totals.`,
    consent_line: consent,
    questions,
    cut_questions: cut,
    notes_for_creator: notes,
    flags,
  };
}

