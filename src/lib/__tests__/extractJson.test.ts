import { describe, it, expect } from "vitest";
import { extractJson } from "../api/extractJson";

describe("extractJson", () => {
  it("extracts a fenced ```json block and surrounding prose", () => {
    const reply =
      '好的，这是为你生成的题目：\n```json\n{"questions": []}\n```';
    const { json, prose } = extractJson(reply);
    expect(json).toBe('{"questions": []}');
    expect(prose).toBe("好的，这是为你生成的题目：");
  });

  it("extracts a bare ``` fence without the json tag", () => {
    const reply = '```\n{"a": 1}\n```';
    expect(extractJson(reply).json).toBe('{"a": 1}');
  });

  it("falls back to a balanced object when no fence is present", () => {
    const reply = 'Here you go: {"questions": [{"id": "q1"}]} done';
    expect(extractJson(reply).json).toBe('{"questions": [{"id": "q1"}]}');
  });

  it("respects braces inside string literals", () => {
    const reply = '{"content": "use { and } in text"}';
    expect(extractJson(reply).json).toBe(
      '{"content": "use { and } in text"}',
    );
  });

  it("handles escaped quotes inside strings", () => {
    const reply = '{"content": "say \\"hi\\" {x}"}';
    expect(extractJson(reply).json).toBe('{"content": "say \\"hi\\" {x}"}');
  });

  it("returns null json and full prose when no JSON is found", () => {
    const reply = "I need more details before generating questions.";
    const { json, prose } = extractJson(reply);
    expect(json).toBeNull();
    expect(prose).toBe(reply);
  });

  it("returns null for an empty fenced block", () => {
    const reply = "```json\n\n```";
    expect(extractJson(reply).json).toBeNull();
  });
});
