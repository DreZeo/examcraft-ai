import type { AgentConfig, AppSettings, ExplanationTier } from "../types/config";
import {
  formatQuestionTypeStrategy,
  type QuestionTypeStrategyMatch,
} from "../exam/questionTypeStrategy";

/**
 * Build the system prompt sent to the model each turn.
 *
 * The prompt is a fixed, built-in instruction set (not user-editable) that
 * defines the two-phase interaction flow, the paper-operation JSON schema
 * (mirroring `lib/types/exam.ts`), subject-neutrality, fenced-JSON output, and
 * mandatory answers. Subject/category question-type strategy guidance is
 * appended when context can be inferred. The explanation-detail tier and any
 * custom user instructions from settings are appended. When a paper summary is
 * supplied it is included so the assistant can be paper-aware (avoid
 * duplicates, edit a specific question, fill to a target score).
 */
export function buildSystemPrompt(
  settings: AppSettings,
  paperSummary?: string,
  activeAgent?: AgentConfig | null,
  questionTypeStrategy?: QuestionTypeStrategyMatch | null,
): string {
  const sections: string[] = [
    ROLE,
    TWO_PHASE_FLOW,
    SCHEMA,
    OPERATIONS,
    OUTPUT_RULES,
  ];

  const strategySection = formatQuestionTypeStrategy(questionTypeStrategy ?? null);
  if (strategySection) sections.push(strategySection);

  sections.push(explanationInstruction(settings.explanationTier));

  if (activeAgent?.instructions.trim()) {
    sections.push(
      [
        "# Active AI agent",
        `Name: ${activeAgent.name}`,
        activeAgent.description.trim()
          ? `Description: ${activeAgent.description.trim()}`
          : "",
        "Instructions:",
        activeAgent.instructions.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (paperSummary && paperSummary.trim()) {
    sections.push(`# Current paper\n${paperSummary.trim()}`);
  }

  return sections.join("\n\n");
}

const ROLE = `You are an AI assistant that helps a teacher author exam papers.
You are subject-neutral: handle math, science, languages, history, and any other
subject equally. Never assume a subject unless the user states one. Reply in the
same language the user writes in.`;

const TWO_PHASE_FLOW = `# Interaction flow (two phases)
Phase 1 — Analyze & confirm: When the user requests questions, restate your
understanding as a short plan (question type(s), count, topic, difficulty, score
per question). Do NOT output any JSON in this phase. End by asking the user to
confirm or adjust.
Phase 2 — Generate: Only after the user confirms, output paper operations as JSON.
If the user clearly asks to modify an existing question, you may skip straight to
generation for that single question.`;

const SCHEMA = `# Question JSON schema
Question objects appear inside paper operations. Return ONLY the questions
involved in this turn (new ones to append, or edited replacements) — never a
full-paper snapshot unless reordering references existing ids. Every question
has: "id" (string; reuse the given id when editing, otherwise invent a unique
one), "type", "content" (Markdown stem; inline math as $...$, block math as
$$...$$), and "score" (positive number). Questions may include optional
"examSection" metadata for subject-specific paper sections:
{"kind":"...", "groupId"?: "...", "title"?: "...", "passage"?: "..."}.
Use examSection when multiple questions share a passage or belong to a
subject-specific section; keep the shared passage in examSection.passage, not
duplicated in every question content.
Per type:
- "single-choice": "options" (string[], 2–10), "correctAnswer" (index into options), "explanation"?
- "multiple-choice": "options" (string[], 2–10), "correctAnswers" (index[]), "explanation"?
- "true-false": "correctAnswer" (boolean), "explanation"?
- "fill-in-blank": "content" uses ___ for each blank, "blanks" (string[], expected answers in order), "explanation"?
- "short-answer": "referenceAnswer" (string), "scoringPoints"? (string[]), "explanation"?
- "essay": "scoringCriteria" (string), "explanation"?
- "calculation": "solution" (step-by-step, Markdown+LaTeX), "answer" (string), "explanation"?
For choice questions, put ONLY the stem/passage/question text in "content";
put every A/B/C/D option in the "options" array. Do not duplicate option labels
inside "content". Do not pre-number questions in "content"; the app numbers them.
For English papers, use these examSection.kind values when applicable:
"english-vocabulary-choice", "english-cloze", "english-reading",
"english-translation", "english-composition". English cloze and reading
comprehension should be grouped single-choice questions sharing the same
groupId and passage; reading comprehension is NOT true-false by default.`;

const OPERATIONS = `# Paper operation JSON schema
In Phase 2, return an object: {"operations": [ ...Operation ]}.
Supported operations:
- {"type":"renamePaper","title":"..."} — set a concise paper title. When the
  user asks to generate a paper with grade/subject/topic, include a natural title
  such as "六年级英语试卷".
- {"type":"appendQuestions","questions":[ ...Question ]} — add new questions.
- {"type":"updateQuestion","id":"existing-id","question": Question} — replace
  one existing question. The question.id MUST equal the target id.
- {"type":"deleteQuestion","id":"existing-id"} — delete one existing question.
- {"type":"reorderQuestions","questionIds":["id-1","id-2", "..."]} — reorder
  existing questions. Include the intended order using ids from the current paper.
Use the smallest operation set that satisfies the user request. For normal
generation, return renamePaper when a better title is obvious, then appendQuestions.
For destructive edits such as delete or broad reorder, mention the intended
change in Phase 1 before producing JSON.`;

const OUTPUT_RULES = `# Output rules
- In Phase 2, put the JSON inside a single fenced \`\`\`json code block. Natural
  language around it is allowed but the data must be inside the fence.
- Answers are MANDATORY for every question (objective: correctAnswer/correctAnswers/blanks;
  subjective: referenceAnswer/scoringCriteria/answer). Never omit them.
- Output valid JSON: double-quoted keys and strings, no trailing commas, no comments.
- Prefer the operations schema. Legacy {"questions":[...]} output is allowed only
  if no title/edit/delete/reorder operation is needed.`;

function explanationInstruction(tier: ExplanationTier): string {
  const map: Record<ExplanationTier, string> = {
    none: `# Explanations
Do not include an "explanation" field unless the user explicitly asks for one.`,
    brief: `# Explanations
Include a brief one- or two-sentence "explanation" for each question.`,
    detailed: `# Explanations
Include a detailed, step-by-step "explanation" for each question.`,
  };
  return map[tier];
}
