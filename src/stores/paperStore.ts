import { create } from "zustand";
import { v4 as uuid } from "uuid";
import {
  type ExamPaper,
  type Question,
  type QuestionType,
} from "../lib/types/exam";
import type { PaperIndex, PaperMeta } from "../lib/types/library";
import {
  appendQuestions,
  removeQuestion,
  moveQuestion,
  updateQuestion,
  replaceById,
} from "../lib/exam/merge";
import { createBlankQuestion } from "../lib/exam/blankQuestion";
import {
  createPaperIndex,
  emptyPaper,
  removePaperMeta,
  renamePaperMeta,
  upsertPaperMeta,
} from "../lib/exam/paperLibrary";
import * as storage from "../lib/storage/tauri";
import { useConfigStore } from "./configStore";

type ViewMode = "teacher" | "student";

interface PaperState {
  paper: ExamPaper;
  papers: PaperMeta[];
  activePaperId: string | null;
  view: ViewMode;
  saveStatus: "saved" | "saving" | "unsaved";
  libraryLoaded: boolean;
  /** Snapshot pushed before an AI-apply, enabling single-level undo. */
  undoSnapshot: ExamPaper | null;

  load: () => Promise<void>;
  newPaper: () => Promise<void>;
  openPaper: (id: string) => Promise<void>;
  renamePaper: (id: string, title: string) => Promise<void>;
  duplicatePaper: (id: string) => Promise<void>;
  deletePaper: (id: string) => Promise<void>;
  /** Replace the entire paper (e.g. JSON project import). Clears undo. */
  replacePaper: (paper: ExamPaper) => Promise<void>;
  setTitle: (title: string) => void;
  setView: (view: ViewMode) => void;

  applyAiQuestions: (questions: Question[], mode: "append" | "replace") => void;
  undoApply: () => void;

  editQuestion: (question: Question) => void;
  /** Append a blank question (default single-choice) and return its new id. */
  addBlankQuestion: (type?: QuestionType) => string;
  deleteQuestion: (id: string) => void;
  reorder: (id: string, direction: "up" | "down") => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const usePaperStore = create<PaperState>((set, get) => {
  function now() {
    return new Date().toISOString();
  }

  /** Debounced auto-save honoring the autoSave setting. */
  function scheduleSave() {
    const { config, dataDir } = useConfigStore.getState();
    const paperId = get().activePaperId;
    if (!config.settings.autoSave || !dataDir) {
      set({ saveStatus: "unsaved" });
      return;
    }
    if (!paperId) return;
    set({ saveStatus: "saving" });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await persistPaper(dataDir, paperId, get().paper);
        set({ saveStatus: "saved" });
      } catch {
        set({ saveStatus: "unsaved" });
      }
    }, 500);
  }

  async function persistIndex(dataDir: string, index: PaperIndex) {
    await storage.savePaperIndex(dataDir, index);
    set({ papers: index.papers, activePaperId: index.activePaperId });
  }

  async function persistPaper(dataDir: string, paperId: string, paper: ExamPaper) {
    await storage.savePaper(dataDir, paperId, paper);
    const current =
      (await storage.loadPaperIndex(dataDir)) ?? {
        version: 1,
        activePaperId: paperId,
        papers: [],
      };
    await persistIndex(dataDir, upsertPaperMeta(current, paperId, paper, now()));
  }

  function mutate(next: ExamPaper, extra: Partial<PaperState> = {}) {
    set({ paper: next, ...extra });
    scheduleSave();
  }

  return {
    paper: emptyPaper(),
    papers: [],
    activePaperId: null,
    view: "teacher",
    saveStatus: "saved",
    libraryLoaded: false,
    undoSnapshot: null,

    load: async () => {
      const { dataDir } = useConfigStore.getState();
      if (!dataDir) return;
      let index = await storage.loadPaperIndex(dataDir);
      if (!index || index.papers.length === 0) {
        const working = (await storage.loadWorkingPaper(dataDir)) ?? emptyPaper();
        const created = createPaperIndex(working, now());
        await storage.savePaper(dataDir, created.paperId, working);
        await storage.savePaperIndex(dataDir, created.index);
        index = created.index;
      }

      const activeId = index.activePaperId ?? index.papers[0]?.id ?? null;
      if (!activeId) {
        set({
          paper: emptyPaper(),
          papers: [],
          activePaperId: null,
          libraryLoaded: true,
          saveStatus: "saved",
          undoSnapshot: null,
        });
        return;
      }
      const loaded = (await storage.loadPaper(dataDir, activeId)) ?? emptyPaper();
      const nextIndex = { ...index, activePaperId: activeId };
      await storage.savePaperIndex(dataDir, nextIndex);
      await storage.saveWorkingPaper(dataDir, loaded);
      set({
        paper: loaded,
        papers: nextIndex.papers,
        activePaperId: activeId,
        libraryLoaded: true,
        saveStatus: "saved",
        undoSnapshot: null,
      });
    },

    newPaper: async () => {
      const { dataDir } = useConfigStore.getState();
      if (!dataDir) return;
      const id = uuid();
      const paper = emptyPaper();
      const current =
        (await storage.loadPaperIndex(dataDir)) ?? {
          version: 1,
          activePaperId: null,
          papers: [],
        };
      await storage.savePaper(dataDir, id, paper);
      const index = upsertPaperMeta(current, id, paper, now());
      await storage.savePaperIndex(dataDir, index);
      set({
        paper,
        papers: index.papers,
        activePaperId: id,
        undoSnapshot: null,
        saveStatus: "saved",
      });
    },

    openPaper: async (id) => {
      const { dataDir } = useConfigStore.getState();
      if (!dataDir) return;
      const loaded = await storage.loadPaper(dataDir, id);
      if (!loaded) return;
      const current = await storage.loadPaperIndex(dataDir);
      const index = current
        ? { ...current, activePaperId: id }
        : createPaperIndex(loaded, now(), id).index;
      await storage.savePaperIndex(dataDir, index);
      await storage.saveWorkingPaper(dataDir, loaded);
      set({
        paper: loaded,
        papers: index.papers,
        activePaperId: id,
        saveStatus: "saved",
        undoSnapshot: null,
      });
    },

    renamePaper: async (id, title) => {
      const { dataDir } = useConfigStore.getState();
      if (!dataDir) return;
      const current = await storage.loadPaperIndex(dataDir);
      if (!current) return;
      const index = renamePaperMeta(current, id, title, now());
      await storage.savePaperIndex(dataDir, index);
      if (id === get().activePaperId) {
        const paper = { ...get().paper, title };
        await persistPaper(dataDir, id, paper);
        set({ paper, papers: index.papers, saveStatus: "saved" });
      } else {
        set({ papers: index.papers });
      }
    },

    duplicatePaper: async (id) => {
      const { dataDir } = useConfigStore.getState();
      if (!dataDir) return;
      const source = await storage.loadPaper(dataDir, id);
      if (!source) return;
      const copy = { ...source, title: `${source.title || "未命名试卷"} 副本` };
      const copyId = uuid();
      const current =
        (await storage.loadPaperIndex(dataDir)) ?? {
          version: 1,
          activePaperId: null,
          papers: [],
        };
      await storage.savePaper(dataDir, copyId, copy);
      const index = upsertPaperMeta(current, copyId, copy, now());
      await storage.savePaperIndex(dataDir, index);
      set({
        paper: copy,
        papers: index.papers,
        activePaperId: copyId,
        saveStatus: "saved",
        undoSnapshot: null,
      });
    },

    deletePaper: async (id) => {
      const { dataDir } = useConfigStore.getState();
      if (!dataDir) return;
      const current = await storage.loadPaperIndex(dataDir);
      if (!current) return;
      await storage.deletePaper(dataDir, id);
      let index = removePaperMeta(current, id);
      if (index.papers.length === 0) {
        const created = createPaperIndex(emptyPaper(), now());
        await storage.savePaper(dataDir, created.paperId, created.paper);
        index = created.index;
      }
      await storage.savePaperIndex(dataDir, index);
      const activeId = index.activePaperId ?? index.papers[0]?.id ?? null;
      const paper = activeId
        ? ((await storage.loadPaper(dataDir, activeId)) ?? emptyPaper())
        : emptyPaper();
      await storage.saveWorkingPaper(dataDir, paper);
      set({
        paper,
        papers: index.papers,
        activePaperId: activeId,
        saveStatus: "saved",
        undoSnapshot: null,
      });
    },

    replacePaper: async (paper) => {
      const { dataDir } = useConfigStore.getState();
      const paperId = get().activePaperId;
      set({ paper, undoSnapshot: null });
      if (dataDir && paperId) {
        await persistPaper(dataDir, paperId, paper);
        set({ saveStatus: "saved" });
      } else {
        scheduleSave();
      }
    },

    setTitle: (title) => mutate({ ...get().paper, title }),

    setView: (view) => set({ view }),

    applyAiQuestions: (questions, mode) => {
      const current = get().paper;
      const next =
        mode === "append"
          ? appendQuestions(current, questions)
          : replaceById(current, questions);
      mutate(next, { undoSnapshot: current });
    },

    undoApply: () => {
      const snapshot = get().undoSnapshot;
      if (snapshot) mutate(snapshot, { undoSnapshot: null });
    },

    editQuestion: (question) => mutate(updateQuestion(get().paper, question)),

    addBlankQuestion: (type = "single-choice") => {
      const question = createBlankQuestion(type, uuid());
      mutate(appendQuestions(get().paper, [question]));
      return question.id;
    },

    deleteQuestion: (id) => mutate(removeQuestion(get().paper, id)),

    reorder: (id, direction) =>
      mutate(moveQuestion(get().paper, id, direction)),
  };
});
