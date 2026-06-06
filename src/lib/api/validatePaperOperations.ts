import { z } from "zod";
import { extractJson } from "./extractJson";
import {
  AiPaperOperationsResponseSchema,
  AiQuestionsResponseSchema,
  type AiPaperOperation,
} from "../types/exam";
import {
  validateQuestionTypeStrategy,
  type QuestionTypeStrategyMatch,
} from "../exam/questionTypeStrategy";
import { formatZodError } from "./validateQuestions";

export type ValidatePaperOperationsResult =
  | { ok: true; operations: AiPaperOperation[] }
  | { ok: false; error: string; raw: string };

/**
 * Validate AI paper-operation payloads. New responses should return
 * `{ operations: [...] }`; legacy `{ questions: [...] }` is converted to append
 * or update operations so old model habits and saved chats remain usable.
 */
export function validatePaperOperations(
  reply: string,
  mode: "append" | "replace",
  questionTypeStrategy?: QuestionTypeStrategyMatch | null,
): ValidatePaperOperationsResult {
  const { json } = extractJson(reply);

  if (!json) {
    return {
      ok: false,
      error: "No JSON block found in the response.",
      raw: reply,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Invalid JSON syntax: ${detail}`, raw: reply };
  }

  const operations = AiPaperOperationsResponseSchema.safeParse(parsed);
  if (operations.success) {
    return validateStrategy(operations.data.operations, questionTypeStrategy, reply);
  }

  const legacy = AiQuestionsResponseSchema.safeParse(parsed);
  if (legacy.success) {
    const converted: AiPaperOperation[] =
      mode === "append"
        ? [{ type: "appendQuestions", questions: legacy.data.questions }]
        : legacy.data.questions.map((question) => ({
            type: "updateQuestion",
            id: question.id,
            question,
          }));
    return validateStrategy(converted, questionTypeStrategy, reply);
  }

  return {
    ok: false,
    error: formatOperationError(operations.error, legacy.error),
    raw: reply,
  };
}

function validateStrategy(
  operations: AiPaperOperation[],
  questionTypeStrategy: QuestionTypeStrategyMatch | null | undefined,
  raw: string,
): ValidatePaperOperationsResult {
  const strategy = validateQuestionTypeStrategy(
    operations,
    questionTypeStrategy ?? null,
  );
  if (!strategy.ok) {
    return { ok: false, error: strategy.error, raw };
  }
  return { ok: true, operations };
}

function formatOperationError(
  operationError: z.ZodError,
  legacyError: z.ZodError,
): string {
  return [
    "Response must contain an operations array or a legacy questions array.",
    "Operations validation:",
    formatZodError(operationError),
    "Legacy questions validation:",
    formatZodError(legacyError),
  ].join("\n");
}
