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

  it("prefers a ```json block over earlier non-json fences", () => {
    const reply = '示例：\n```\nnot json\n```\n数据：\n```json\n{"a": 1}\n```';
    const { json, prose } = extractJson(reply);
    expect(json).toBe('{"a": 1}');
    expect(prose).toBe("示例：\n```\nnot json\n```\n数据：");
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

  it("does not stop at markdown fences escaped inside a JSON string", () => {
    const payload = {
      questions: [
        {
          id: "q1",
          type: "short-answer",
          content:
            "【程序修改题】\\n```c\\nint gcd(int a, int b) {\\n    while (b = 0) { }\\n}\\n```",
          score: 15,
          referenceAnswer: "改为 `while (b != 0)` 并返回 `a`。",
        },
      ],
    };
    const reply = `好的，生成如下：\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n请确认。`;
    const { json, prose } = extractJson(reply);

    expect(prose).toBe("好的，生成如下：");
    expect(JSON.parse(json ?? "")).toEqual(payload);
  });

  it("does not stop at fenced reference answers escaped inside JSON strings", () => {
    const payload = {
      questions: [
        {
          id: "q1",
          type: "short-answer",
          content: "编写一个统计字符次数的函数。",
          score: 15,
          referenceAnswer:
            "```c\nint count_char(char *str, char ch) {\n    return 0;\n}\n```",
        },
      ],
    };
    const reply = `\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;

    expect(JSON.parse(extractJson(reply).json ?? "")).toEqual(payload);
  });
});
