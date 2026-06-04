import { z } from "zod";

/**
 * Exam paper domain model — the canonical data contract.
 *
 * Storage model is hybrid: each question carries structural fields (type, score,
 * answer, etc.) plus a Markdown `content` field. The center pane renders the
 * assembled Markdown live. AI returns JSON conforming to these schemas; the app
 * validates with Zod before merging into the paper.
 *
 * Objective types (single-choice, multiple-choice, true-false, fill-in-blank)
 * carry a checkable answer. Subjective types (short-answer, essay, calculation)
 * carry a reference answer / scoring guidance.
 */

/** Current schema version, persisted in working-paper.json for future migrations. */
export const PAPER_SCHEMA_VERSION = 1;

const baseFields = {
  id: z.string().min(1),
  /** Markdown question stem (supports KaTeX math, GFM tables, code blocks). */
  content: z.string(),
  score: z.number().positive(),
};

export const SingleChoiceSchema = z.object({
  ...baseFields,
  type: z.literal("single-choice"),
  options: z.array(z.string()).min(2).max(10),
  /** Index into `options`. */
  correctAnswer: z.number().int().nonnegative(),
  explanation: z.string().optional(),
});

export const MultipleChoiceSchema = z.object({
  ...baseFields,
  type: z.literal("multiple-choice"),
  options: z.array(z.string()).min(2).max(10),
  /** Indices into `options`. */
  correctAnswers: z.array(z.number().int().nonnegative()).min(1),
  explanation: z.string().optional(),
});

export const TrueFalseSchema = z.object({
  ...baseFields,
  type: z.literal("true-false"),
  correctAnswer: z.boolean(),
  explanation: z.string().optional(),
});

export const FillInBlankSchema = z.object({
  ...baseFields,
  type: z.literal("fill-in-blank"),
  /** One expected answer per blank, in order. */
  blanks: z.array(z.string()).min(1),
  explanation: z.string().optional(),
});

export const ShortAnswerSchema = z.object({
  ...baseFields,
  type: z.literal("short-answer"),
  referenceAnswer: z.string(),
  scoringPoints: z.array(z.string()).optional(),
  explanation: z.string().optional(),
});

export const EssaySchema = z.object({
  ...baseFields,
  type: z.literal("essay"),
  scoringCriteria: z.string(),
  explanation: z.string().optional(),
});

export const CalculationSchema = z.object({
  ...baseFields,
  type: z.literal("calculation"),
  /** Step-by-step solution (Markdown + KaTeX). */
  solution: z.string(),
  answer: z.string(),
  explanation: z.string().optional(),
});

export const QuestionSchema = z.discriminatedUnion("type", [
  SingleChoiceSchema,
  MultipleChoiceSchema,
  TrueFalseSchema,
  FillInBlankSchema,
  ShortAnswerSchema,
  EssaySchema,
  CalculationSchema,
]);

export const ExamMetadataSchema = z.object({
  subject: z.string().optional(),
  grade: z.string().optional(),
  className: z.string().optional(),
  /** Exam duration in minutes. */
  duration: z.number().positive().optional(),
  totalScore: z.number().positive().optional(),
});

export const ExamPaperSchema = z.object({
  version: z.number().int().default(PAPER_SCHEMA_VERSION),
  title: z.string(),
  metadata: ExamMetadataSchema.optional(),
  questions: z.array(QuestionSchema),
});

/**
 * Shape the AI returns: only the questions involved in this turn (never a full
 * paper snapshot). The program merges them into the paper (append or replace-by-id).
 */
export const AiQuestionsResponseSchema = z.object({
  questions: z.array(QuestionSchema),
});

export const AiPaperOperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("renamePaper"),
    title: z.string().min(1),
  }),
  z.object({
    type: z.literal("appendQuestions"),
    questions: z.array(QuestionSchema).min(1),
  }),
  z.object({
    type: z.literal("updateQuestion"),
    id: z.string().min(1),
    question: QuestionSchema,
  }).refine((operation) => operation.id === operation.question.id, {
    message: "id must match question.id",
    path: ["question", "id"],
  }),
  z.object({
    type: z.literal("deleteQuestion"),
    id: z.string().min(1),
  }),
  z.object({
    type: z.literal("reorderQuestions"),
    questionIds: z.array(z.string().min(1)).min(1),
  }),
]);

export const AiPaperOperationsResponseSchema = z.object({
  operations: z.array(AiPaperOperationSchema).min(1),
});

export type QuestionType = Question["type"];
export type SingleChoiceQuestion = z.infer<typeof SingleChoiceSchema>;
export type MultipleChoiceQuestion = z.infer<typeof MultipleChoiceSchema>;
export type TrueFalseQuestion = z.infer<typeof TrueFalseSchema>;
export type FillInBlankQuestion = z.infer<typeof FillInBlankSchema>;
export type ShortAnswerQuestion = z.infer<typeof ShortAnswerSchema>;
export type EssayQuestion = z.infer<typeof EssaySchema>;
export type CalculationQuestion = z.infer<typeof CalculationSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type ExamMetadata = z.infer<typeof ExamMetadataSchema>;
export type ExamPaper = z.infer<typeof ExamPaperSchema>;
export type AiQuestionsResponse = z.infer<typeof AiQuestionsResponseSchema>;
export type AiPaperOperation = z.infer<typeof AiPaperOperationSchema>;
export type AiPaperOperationsResponse = z.infer<
  typeof AiPaperOperationsResponseSchema
>;

/** Question types whose answers are objective/checkable. */
export const OBJECTIVE_TYPES: readonly QuestionType[] = [
  "single-choice",
  "multiple-choice",
  "true-false",
  "fill-in-blank",
];

export function isObjective(type: QuestionType): boolean {
  return OBJECTIVE_TYPES.includes(type);
}
