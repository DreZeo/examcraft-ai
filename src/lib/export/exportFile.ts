import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { ExamPaperSchema, type ExamPaper } from "../types/exam";
import {
  paperToMarkdown,
  type ExamInfoFieldFlags,
} from "./markdown";

/**
 * Export wrappers around the Tauri dialog + fs plugins. The save dialog defaults
 * to the given data directory so files land alongside the user's project data.
 * All functions return `true` when a file was written / read, `false` when the
 * user cancelled the dialog.
 */

/** Suggest a safe file stem from the paper title. */
function fileStem(paper: ExamPaper): string {
  const base = paper.title.trim() || "exam-paper";
  return base.replace(/[\\/:*?"<>|]/g, "_");
}

function defaultPath(dataDir: string | null, name: string): string | undefined {
  if (!dataDir) return undefined;
  const sep = dataDir.includes("\\") ? "\\" : "/";
  return `${dataDir.replace(/[\\/]+$/, "")}${sep}${name}`;
}

/** Save the full paper as a JSON project file. */
export async function exportJson(
  paper: ExamPaper,
  dataDir: string | null,
): Promise<boolean> {
  const name = `${fileStem(paper)}.json`;
  const path = await save({
    defaultPath: defaultPath(dataDir, name),
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (!path) return false;
  await writeTextFile(path, JSON.stringify(paper, null, 2));
  return true;
}

export interface MarkdownExportConfig {
  includeAnswers: boolean;
  header?: ExamInfoFieldFlags;
}

/** Export the assembled paper as a Markdown file (teacher or student variant). */
export async function exportMarkdown(
  paper: ExamPaper,
  dataDir: string | null,
  config: MarkdownExportConfig,
): Promise<boolean> {
  const suffix = config.includeAnswers ? "" : "-student";
  const name = `${fileStem(paper)}${suffix}.md`;
  const path = await save({
    defaultPath: defaultPath(dataDir, name),
    filters: [{ name: "Markdown", extensions: ["md"] }],
  });
  if (!path) return false;
  await writeTextFile(path, paperToMarkdown(paper, config));
  return true;
}

/**
 * Open a JSON project file, validate it against the paper schema, and return the
 * parsed paper. Returns `null` if the user cancelled. Throws (ZodError / parse
 * error) when the selected file is not a valid paper so callers can surface it.
 */
export async function importJson(
  dataDir: string | null,
): Promise<ExamPaper | null> {
  const path = await open({
    multiple: false,
    directory: false,
    defaultPath: dataDir ?? undefined,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (typeof path !== "string") return null;
  const raw = await readTextFile(path);
  return ExamPaperSchema.parse(JSON.parse(raw));
}
