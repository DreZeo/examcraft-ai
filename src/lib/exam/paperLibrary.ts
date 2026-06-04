import { v4 as uuid } from "uuid";
import { ExamPaperSchema, type ExamPaper } from "../types/exam";
import type { PaperIndex, PaperMeta } from "../types/library";

export function emptyPaper(): ExamPaper {
  return ExamPaperSchema.parse({ title: "", questions: [] });
}

export function buildPaperMeta(
  paper: ExamPaper,
  id: string,
  now: string,
  existing?: PaperMeta,
): PaperMeta {
  return {
    id,
    title: paper.title.trim() || "未命名试卷",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    questionCount: paper.questions.length,
  };
}

export function createPaperIndex(
  paper: ExamPaper,
  now: string,
  id = uuid(),
): { index: PaperIndex; paperId: string; paper: ExamPaper } {
  return {
    index: {
      version: 1,
      activePaperId: id,
      papers: [buildPaperMeta(paper, id, now)],
    },
    paperId: id,
    paper,
  };
}

export function upsertPaperMeta(
  index: PaperIndex,
  paperId: string,
  paper: ExamPaper,
  now: string,
): PaperIndex {
  const existing = index.papers.find((item) => item.id === paperId);
  const next = buildPaperMeta(paper, paperId, now, existing);
  const papers = existing
    ? index.papers.map((item) => (item.id === paperId ? next : item))
    : [next, ...index.papers];
  return {
    ...index,
    activePaperId: paperId,
    papers: sortPapers(papers),
  };
}

export function renamePaperMeta(
  index: PaperIndex,
  paperId: string,
  title: string,
  now: string,
): PaperIndex {
  return {
    ...index,
    papers: sortPapers(
      index.papers.map((item) =>
        item.id === paperId
          ? { ...item, title: title.trim() || item.title, updatedAt: now }
          : item,
      ),
    ),
  };
}

export function removePaperMeta(
  index: PaperIndex,
  paperId: string,
): PaperIndex {
  const papers = index.papers.filter((item) => item.id !== paperId);
  const activePaperId =
    index.activePaperId === paperId
      ? (sortPapers(papers)[0]?.id ?? null)
      : index.activePaperId;
  return { ...index, activePaperId, papers: sortPapers(papers) };
}

function sortPapers(papers: PaperMeta[]): PaperMeta[] {
  return [...papers].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
