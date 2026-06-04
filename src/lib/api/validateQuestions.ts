import { z } from "zod";
import { extractJson } from "./extractJson";
import { AiQuestionsResponseSchema, type Question } from "../types/exam";

/**
 * Validate the question payload inside an AI reply.
 *
 * Pipeline: locate the JSON (fenced ```json block or balanced object) with
 * {@link extractJson}, `JSON.parse` it, then run the Zod schema. The result is a
 * discriminated union so callers branch on `ok` without throwing.
 *
 * On failure, `error` is a human-readable, line-per-issue string suitable for
 * feeding back to the model as a self-correction prompt, and `raw` is the
 * original reply (used for the "view raw response" debugging affordance).
 */
export type ValidateResult =
  | { ok: true; questions: Question[] }
  | { ok: false; error: string; raw: string };

export function validateQuestions(reply: string): ValidateResult {
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

  const result = AiQuestionsResponseSchema.safeParse(parsed);
  if (result.success) {
    return { ok: true, questions: result.data.questions };
  }

  return { ok: false, error: formatZodError(result.error), raw: reply };
}

/**
 * Render Zod issues as one human line each. Issues inside the `questions` array
 * are prefixed with a 1-based question number ("Question 3: score — ...") so the
 * model (and the user) can locate the offending item quickly.
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path;
      if (path[0] === "questions" && typeof path[1] === "number") {
        const field = path.slice(2).join(".");
        const where = field ? `${field} ` : "";
        return `Question ${path[1] + 1}: ${where}${issue.message}`;
      }
      const where = path.length > 0 ? `${path.join(".")} ` : "";
      return `${where}${issue.message}`.trim();
    })
    .join("\n");
}
