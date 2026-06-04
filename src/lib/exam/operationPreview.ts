import type { AiPaperOperation, Question } from "../types/exam";

export type PaperOperationPreview = {
  rename?: Extract<AiPaperOperation, { type: "renamePaper" }>;
  added: Question[];
  updated: Question[];
  deleted: string[];
  reordered: string[] | null;
};

/** Summarize validated AI operations for UI review without mutating the paper. */
export function previewPaperOperations(
  operations: AiPaperOperation[],
  legacyQuestions: Question[] | undefined = undefined,
): PaperOperationPreview {
  const preview: PaperOperationPreview = {
    added: legacyQuestions ?? [],
    updated: [],
    deleted: [],
    reordered: null,
  };

  for (const operation of operations) {
    switch (operation.type) {
      case "renamePaper":
        preview.rename = operation;
        break;
      case "appendQuestions":
        preview.added.push(...operation.questions);
        break;
      case "updateQuestion":
        preview.updated.push(operation.question);
        break;
      case "deleteQuestion":
        preview.deleted.push(operation.id);
        break;
      case "reorderQuestions":
        preview.reordered = operation.questionIds;
        break;
      default:
        exhaustive(operation);
    }
  }

  return preview;
}

export function countPaperOperationChanges(
  preview: PaperOperationPreview,
): number {
  return (
    (preview.rename ? 1 : 0) +
    preview.added.length +
    preview.updated.length +
    preview.deleted.length +
    (preview.reordered ? 1 : 0)
  );
}

function exhaustive(value: never): never {
  throw new Error(`Unhandled paper operation: ${JSON.stringify(value)}`);
}
