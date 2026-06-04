/**
 * Extract a JSON payload from an AI reply.
 *
 * Per the AI interaction protocol, the model puts question data inside a
 * ```json ... ``` fenced code block, possibly surrounded by natural-language
 * text. This module isolates the fenced block so the surrounding prose can be
 * shown in the chat bubble while the JSON is parsed and validated separately.
 *
 * Tolerant by design: if no fenced block is found we fall back to the first
 * balanced `{...}` object, so a model that returns raw JSON still works.
 */

const FENCE_RE = /```(?:json)?\s*\n?([\s\S]*?)```/i;

export interface ExtractedJson {
  /** The raw JSON string located in the reply, or null if none found. */
  json: string | null;
  /** Text before the JSON block (natural language shown in the chat bubble). */
  prose: string;
}

/**
 * Locate a JSON payload in an AI reply. Prefers a fenced ```json block; falls
 * back to the first balanced top-level object.
 */
export function extractJson(reply: string): ExtractedJson {
  const fenceMatch = reply.match(FENCE_RE);
  if (fenceMatch) {
    const json = fenceMatch[1].trim();
    const prose = reply.slice(0, fenceMatch.index ?? 0).trim();
    return { json: json.length > 0 ? json : null, prose };
  }

  const balanced = findBalancedObject(reply);
  if (balanced) {
    const prose = reply.slice(0, balanced.start).trim();
    return { json: balanced.text, prose };
  }

  return { json: null, prose: reply.trim() };
}

interface BalancedMatch {
  text: string;
  start: number;
}

/**
 * Find the first balanced `{...}` object in a string, respecting string
 * literals and escapes so braces inside JSON strings don't break balancing.
 */
function findBalancedObject(text: string): BalancedMatch | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return { text: text.slice(start, i + 1), start };
      }
    }
  }

  return null;
}
