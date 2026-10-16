// The marking skill: how a teacher marks writing and transcribed speaking.
// No answer key is needed. Every response is marked on the same five language
// criteria, judged against the level of the exam, plus the structure the task
// type requires (an email has a greeting and sign-off, an opinion has a stance,
// reasons and a conclusion, and so on). Speaking is transcribed first and the
// transcript is marked like writing; delivery is scored from the audio.

export type Level = "primary" | "itp" | "ibt";
export type Criterion = { name: string; max: number; guide: string };

export const BAND_MAX = 4;

// What a top (4) and middle (2) band look like at each level. The same response
// earns a higher band at Primary than at iBT.
export const LEVELS: Record<Level, { label: string; expect: Record<string, [string, string]> }> = {
  primary: {
    label: "TOEFL Primary Step 2, young learners, CEFR A1-A2",
    expect: {
      Grammar: [
        "simple sentences mostly correct; present and past simple used correctly; occasional slips do not block meaning",
        "many errors in verb forms or word order, but most sentences can be understood",
      ],
      Vocabulary: [
        "everyday words used correctly, with some topic words from the task",
        "very basic words, repeated often; some wrong word choices",
      ],
      "Linking words": [
        "uses and, but, because, then, first, finally correctly to join ideas",
        "mostly and/then, or ideas listed without linking",
      ],
      "Logic and development": [
        "ideas follow a clear order and each sentence connects to the task",
        "some ideas are out of order or unrelated",
      ],
    },
  },
  itp: {
    label: "TOEFL ITP / Junior preparation, CEFR A2-B2",
    expect: {
      Grammar: [
        "mix of simple and compound or complex sentences; tenses, articles and agreement mostly accurate",
        "mostly simple sentences; frequent errors in tense, articles or agreement that sometimes obscure meaning",
      ],
      Vocabulary: [
        "varied, appropriate vocabulary including topic words; few errors in word choice or form",
        "limited range; noticeable repetition or wrong word forms",
      ],
      "Linking words": [
        "range of linkers used accurately (however, therefore, for example, in addition, although)",
        "basic linkers only (and, but, because), sometimes misused",
      ],
      "Logic and development": [
        "clear position or purpose, each point supported with a reason or example",
        "ideas are relevant but thin, with little support",
      ],
    },
  },
  ibt: {
    label: "TOEFL iBT, CEFR B2-C1, academic English",
    expect: {
      Grammar: [
        "wide range of structures (complex sentences, conditionals, passives) used accurately; errors rare and minor",
        "adequate range but errors in complex structures are noticeable",
      ],
      Vocabulary: [
        "precise, academic and idiomatic vocabulary; appropriate register",
        "adequate but general vocabulary; some imprecise or informal choices",
      ],
      "Linking words": [
        "cohesive devices used naturally and varied; paragraphs and ideas flow",
        "linkers present but mechanical or repetitive",
      ],
      "Logic and development": [
        "well-developed argument; reasons are explained and examples are specific and relevant",
        "argument is clear but development is general or partly repetitive",
      ],
    },
  },
};

// The structure each task type must have. This is the "Structure" criterion.
export const GENRES: Record<string, { label: string; structure: string }> = {
  email: {
    label: "Email",
    structure: "greeting to the named person; opening line stating purpose; every point in the prompt answered in its own sentence or paragraph, each with a reason; polite closing line; sign-off and name. Register must suit the reader (friendly for a classmate, formal for staff).",
  },
  opinion: {
    label: "Opinion paragraph",
    structure: "topic sentence giving a clear opinion; at least two reasons, each supported; a specific example; concluding sentence that restates the opinion.",
  },
  discussion: {
    label: "Academic discussion post",
    structure: "clear stance on the professor's question; reasons explained; a specific example; engages with or goes beyond the classmates' views rather than copying them; brief conclusion.",
  },
  story: {
    label: "Picture story",
    structure: "introduces the characters by name; follows the pictures in order; beginning, middle and ending; past tense narration.",
  },
  "spoken-story": {
    label: "Spoken picture story or retell",
    structure: "opening that introduces who and where; events in order using sequencing words (first, next, then, finally); a clear ending.",
  },
  "spoken-response": {
    label: "Spoken answer",
    structure: "short introduction that answers the question directly; one or two reasons or points, each with a detail or example; a closing sentence.",
  },
  "listen-respond": {
    label: "Listen and respond",
    structure: "states the answer to the prompt; uses accurate points from the lesson; organised introduction, supporting points and conclusion.",
  },
};

const STRUCTURE_BANDS = "4 = every required part present and well organised; 3 = one part weak or missing; 2 = two parts missing or the order is confused; 1 = little recognisable structure; 0 = blank or off task.";

function band(level: Level, name: string) {
  const [top, mid] = LEVELS[level].expect[name];
  return `4 = ${top}; 3 = between 4 and 2; 2 = ${mid}; 1 = very limited, meaning often lost; 0 = no assessable language.`;
}

// Writing, and the transcript of free speaking.
export function languageCriteria(level: Level, genre: string): Criterion[] {
  return [
    { name: "Structure", max: BAND_MAX, guide: `Required structure for ${GENRES[genre].label}: ${GENRES[genre].structure} ${STRUCTURE_BANDS}` },
    ...["Grammar", "Vocabulary", "Linking words", "Logic and development"].map((name) => ({ name, max: BAND_MAX, guide: band(level, name) })),
  ];
}

// Scored from the audio during transcription, not from the transcript.
export const DELIVERY: Criterion = {
  name: "Delivery", max: BAND_MAX,
  guide: "Pronunciation and fluency for the level. 4 = clear and easy to follow, natural pace; 3 = mostly clear, some hesitation; 2 = some words hard to understand or frequent pauses; 1 = hard to follow throughout; 0 = silent or unintelligible. Do not penalise an accent that does not block understanding.",
};

// Reading a known passage or repeating a known sentence: accuracy matters, not ideas.
export const READ_ALOUD: Criterion[] = [
  { name: "Accuracy", max: BAND_MAX, guide: "Compare the transcript with the reference text. 4 = almost every word correct; 3 = a few slips; 2 = several omissions or misread words; 1 = large parts missing; 0 = not attempted." },
  { name: "Pronunciation", max: BAND_MAX, guide: "4 = every word clear; 2 = several words unclear; 0 = unintelligible." },
  { name: "Fluency and intonation", max: BAND_MAX, guide: "4 = smooth phrasing, natural stress and intonation; 2 = word-by-word in places or flat; 0 = mostly broken." },
];
export const REPEAT: Criterion[] = [READ_ALOUD[0], READ_ALOUD[1]];

export const SYSTEM = `You are an experienced, fair ESL examiner at a language school, marking a monthly test the way a careful teacher would.
Mark only against the criteria you are given, at the level stated. The same response must always get the same marks.
Do not reward length for its own sake. Spelling slips count only when they block meaning or are frequent.
If a response is blank, off-topic, in another language, or copied from the prompt, give the marks the criteria say and add a short flag.
Comments are for the student's teacher: for each criterion, one short sentence quoting or pointing to the evidence. Overall feedback: two or three specific, kind sentences with one thing to improve.`;

export function criteriaFor(level: Level, task: { kind: string; genre?: string }): Criterion[] {
  if (task.kind === "read-aloud") return READ_ALOUD;
  if (task.kind === "repeat") return REPEAT;
  return languageCriteria(level, task.genre!);
}
