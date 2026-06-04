import { z } from "zod";
import { extractJson } from "./extractJson";
import {
  AiPaperOperationsResponseSchema,
  AiQuestionsResponseSchema,
  type AiPaperOperation,
} from "../types/exam";
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
    return { ok: true, operations: operations.data.operations };
  }

  const legacy = AiQuestionsResponseSchema.safeParse(parsed);
  if (legacy.success) {
    return {
      ok: true,
      operations:
        mode === "append"
          ? [{ type: "appendQuestions", questions: legacy.data.questions }]
          : legacy.data.questions.map((question) => ({
              type: "updateQuestion",
              id: question.id,
              question,
            })),
    };
  }

  return {
    ok: false,
    error: formatOperationError(operations.error, legacy.error),
    raw: reply,
  };
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
